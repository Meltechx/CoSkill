"""
Performance service.

Requires a `performance_scores` table in Supabase with the following schema:

    CREATE TABLE performance_scores (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        task_id         uuid NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
        score           float NOT NULL,
        completion_time_score  float NOT NULL,
        difficulty_multiplier  float NOT NULL,
        consistency_score      float NOT NULL,
        created_at      timestamptz DEFAULT now()
    );

    -- RLS
    ALTER TABLE performance_scores ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users_own_scores" ON performance_scores
        USING (user_id = auth.uid());
"""

from datetime import datetime, timezone
from fastapi import HTTPException, status
from supabase import Client

from services.ai_service import AIService

DIFFICULTY_MULTIPLIERS = {
    "easy": 0.7,
    "medium": 1.0,
    "hard": 1.3,
    "expert": 1.5,
}


class PerformanceService:
    def __init__(self, client: Client):
        self.client = client

    # ── Score calculation ──────────────────────────────────────────────

    def _calculate_score(self, task: dict) -> dict:
        """
        Compute score components and return a dict ready for DB insert.

        completion_time_score (0-100):
            100 if actual <= estimated, drops linearly; 0 at 2× estimated.
        difficulty_multiplier:
            easy=0.7, medium=1.0, hard=1.3, expert=1.5
        consistency_score (0 or 100):
            100 if task completed before the project deadline, else 60.
            Defaults to 100 when no deadline is set.
        final score = min(100, (time*0.7 + consistency*0.3) * multiplier)
        """
        # -- Component 1: completion time --------------------------------
        estimated = task.get("estimated_hours")
        actual = task.get("actual_hours")
        if estimated and actual and estimated > 0:
            ratio = actual / estimated
            time_score = 100.0 if ratio <= 1.0 else max(0.0, 100.0 - (ratio - 1.0) * 100.0)
        else:
            time_score = 70.0  # neutral default when hours aren't tracked

        # -- Component 2: difficulty multiplier --------------------------
        multiplier = DIFFICULTY_MULTIPLIERS.get(task.get("difficulty", "medium"), 1.0)

        # -- Component 3: consistency (deadline) -------------------------
        project = task.get("projects") or {}
        deadline_str = project.get("deadline") if isinstance(project, dict) else None
        completed_at_str = task.get("completed_at")

        if deadline_str and completed_at_str:
            try:
                deadline_dt = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                completed_dt = datetime.fromisoformat(completed_at_str.replace("Z", "+00:00"))
                consistency_score = 100.0 if completed_dt <= deadline_dt else 60.0
            except ValueError:
                consistency_score = 100.0
        else:
            consistency_score = 100.0

        # -- Final score -------------------------------------------------
        base = time_score * 0.7 + consistency_score * 0.3
        final_score = round(min(100.0, base * multiplier), 1)

        return {
            "score": final_score,
            "completion_time_score": round(time_score, 1),
            "difficulty_multiplier": multiplier,
            "consistency_score": round(consistency_score, 1),
        }

    # ── score_task ─────────────────────────────────────────────────────

    async def score_task(self, task_id: str, user_id: str) -> dict:
        """Calculate and persist a performance score for a completed task."""
        # Fetch task + project via join (RLS ensures ownership via project.user_id)
        resp = (
            self.client.table("tasks")
            .select("*, projects!inner(user_id, title, deadline)")
            .eq("id", task_id)
            .single()
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

        task = resp.data
        if task["projects"]["user_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        if task["status"] != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be completed before scoring.",
            )

        components = self._calculate_score(task)
        payload = {"user_id": user_id, "task_id": task_id, **components}

        # Upsert: update if already scored, insert otherwise
        existing = (
            self.client.table("performance_scores")
            .select("id")
            .eq("task_id", task_id)
            .execute()
        )
        if existing.data:
            result = (
                self.client.table("performance_scores")
                .update(components)
                .eq("task_id", task_id)
                .execute()
            )
        else:
            result = self.client.table("performance_scores").insert(payload).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save performance score.",
            )

        row = result.data[0]
        return {
            "task_id": task_id,
            "score": row["score"],
            "completion_time_score": row["completion_time_score"],
            "difficulty_multiplier": row["difficulty_multiplier"],
            "consistency_score": row["consistency_score"],
        }

    # ── get_summary ────────────────────────────────────────────────────

    async def get_summary(self, user_id: str) -> dict:
        """
        Aggregate performance data for the dashboard profile page.
        Returns counts, overall score, per-skill breakdown, and recent completions.
        """
        # 1. All projects for this user
        proj_resp = self.client.table("projects").select("id").execute()
        project_rows = proj_resp.data or []
        total_projects = len(project_rows)
        project_ids = [p["id"] for p in project_rows]

        if not project_ids:
            return self._empty_summary()

        # 2. All tasks across those projects (with joined project title/deadline)
        tasks_resp = (
            self.client.table("tasks")
            .select("id, title, status, difficulty, skill_tags, estimated_hours, actual_hours, completed_at, projects(title, deadline)")
            .in_("project_id", project_ids)
            .order("completed_at", desc=True)
            .execute()
        )
        all_tasks = tasks_resp.data or []
        total_tasks = len(all_tasks)
        completed_tasks = [t for t in all_tasks if t["status"] == "completed"]
        completed_count = len(completed_tasks)

        # 3. Performance scores for completed tasks
        completed_ids = [t["id"] for t in completed_tasks]
        score_map: dict[str, float] = {}
        if completed_ids:
            scores_resp = (
                self.client.table("performance_scores")
                .select("task_id, score")
                .in_("task_id", completed_ids)
                .execute()
            )
            score_map = {s["task_id"]: s["score"] for s in (scores_resp.data or [])}

        # 4. Overall score = avg of all scored tasks
        scored_values = list(score_map.values())
        overall_score = round(sum(scored_values) / len(scored_values), 1) if scored_values else 0.0
        avg_task_score = overall_score

        # 5. Skill breakdown: aggregate score per unique skill tag
        skill_totals: dict[str, list[float]] = {}
        for task in completed_tasks:
            task_score = score_map.get(task["id"])
            if task_score is None:
                continue
            for tag in task.get("skill_tags") or []:
                if tag:
                    skill_totals.setdefault(tag, []).append(task_score)

        skill_scores = sorted(
            [
                {
                    "skill": tag,
                    "score": round(sum(vals) / len(vals), 1),
                    "tasks_count": len(vals),
                }
                for tag, vals in skill_totals.items()
            ],
            key=lambda x: x["score"],
            reverse=True,
        )

        # 6. Recent completions (up to 10, sorted newest first)
        recent_raw = sorted(
            [t for t in completed_tasks if t.get("completed_at")],
            key=lambda t: t["completed_at"],
            reverse=True,
        )[:10]

        recent_completions = [
            {
                "task_id": t["id"],
                "task_title": t["title"],
                "project_title": (
                    t["projects"]["title"]
                    if isinstance(t.get("projects"), dict) and t["projects"].get("title")
                    else "Unknown project"
                ),
                "completed_at": t["completed_at"],
                "score": score_map.get(t["id"]),
                "difficulty": t["difficulty"],
                "skill_tags": t.get("skill_tags") or [],
            }
            for t in recent_raw
        ]

        return {
            "overall_score": overall_score,
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "completed_tasks": completed_count,
            "avg_task_score": avg_task_score,
            "skill_scores": skill_scores,
            "recent_completions": recent_completions,
        }

    # ── get_insights ───────────────────────────────────────────────────

    async def get_insights(self, user_id: str, ai_service: AIService) -> dict:
        """Fetch skill data then ask GPT to analyze strengths and gaps."""
        summary = await self.get_summary(user_id)
        return await ai_service.generate_insights(
            skill_scores=summary["skill_scores"],
            completed_tasks=summary["completed_tasks"],
            overall_score=summary["overall_score"],
        )

    # ── helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _empty_summary() -> dict:
        return {
            "overall_score": 0.0,
            "total_projects": 0,
            "total_tasks": 0,
            "completed_tasks": 0,
            "avg_task_score": 0.0,
            "skill_scores": [],
            "recent_completions": [],
        }
