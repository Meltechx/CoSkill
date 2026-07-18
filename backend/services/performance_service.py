from fastapi import HTTPException, status
from supabase import Client

from services.ai_service import AIService

DIFFICULTY_SCORES = {
    "easy": 70.0,
    "medium": 80.0,
    "hard": 90.0,
    "expert": 100.0,
}


class PerformanceService:
    def __init__(self, client: Client):
        self.client = client

    # ── Score calculation ──────────────────────────────────────────────

    def _calculate_score(self, task: dict) -> dict:
        """
        completion_time_score:
            100 if actual_hours <= estimated_hours,
            else (estimated / actual) * 100, clamped to [0, 100].
        difficulty_score:
            easy=70, medium=80, hard=90, expert=100.
        score:
            average of the two components.
        consistency_score stored as 100 (not used in formula; kept for schema).
        """
        estimated = task.get("estimated_hours")
        actual = task.get("actual_hours")

        if estimated and actual and float(estimated) > 0 and float(actual) > 0:
            if float(actual) <= float(estimated):
                time_score = 100.0
            else:
                time_score = round(min(100.0, (float(estimated) / float(actual)) * 100), 1)
        else:
            time_score = 80.0  # neutral default when hours aren't tracked

        difficulty_score = DIFFICULTY_SCORES.get(task.get("difficulty", "medium"), 80.0)
        score = round((time_score + difficulty_score) / 2, 1)

        return {
            "score": score,
            "completion_time_score": time_score,
            "difficulty_score": difficulty_score,
            "consistency_score": 100.0,  # schema requires it; not part of formula
        }

    # ── score_task ─────────────────────────────────────────────────────

    async def score_task(self, task_id: str, user_id: str) -> dict:
        """Calculate and persist a performance score for a completed task."""
        resp = (
            self.client.table("tasks")
            .select("id, difficulty, estimated_hours, actual_hours, status, projects!inner(user_id)")
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

        # Upsert on (user_id, task_id) — DB trigger updates skill_profiles on insert
        result = (
            self.client.table("performance_scores")
            .upsert(payload, on_conflict="user_id,task_id")
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save performance score.",
            )

        row = result.data[0]
        return {
            "task_id": task_id,
            "score": float(row["score"]),
            "completion_time_score": float(row["completion_time_score"]),
            "difficulty_score": float(row["difficulty_score"]),
        }

    # ── get_summary ────────────────────────────────────────────────────

    async def get_summary(self, user_id: str) -> dict:
        """
        Return performance summary.
        - task counts from `tasks` table (RLS filters to user's projects)
        - avg_score from `performance_scores`
        - skill_profiles from `skill_profiles` (maintained by DB trigger)
        - recent_completions from completed tasks joined with project title
        """
        # 1. Project count (RLS restricts to current user automatically)
        proj_resp = self.client.table("projects").select("id").execute()
        total_projects = len(proj_resp.data or [])

        # 2. All tasks via RLS (tasks are accessible through project ownership)
        tasks_resp = (
            self.client.table("tasks")
            .select("id, title, status, difficulty, skill_tags, completed_at, projects(title)")
            .order("completed_at", desc=True, nullsfirst=False)
            .execute()
        )
        all_tasks = tasks_resp.data or []
        total_tasks = len(all_tasks)
        completed_tasks = [t for t in all_tasks if t["status"] == "completed"]
        completed_count = len(completed_tasks)

        # 3. Avg score from performance_scores (RLS filters to user's rows)
        scores_resp = (
            self.client.table("performance_scores")
            .select("task_id, score")
            .execute()
        )
        score_rows = scores_resp.data or []
        score_map = {s["task_id"]: float(s["score"]) for s in score_rows}
        all_scores = list(score_map.values())
        avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

        # 4. Skill profiles from the dedicated table (kept current by DB trigger)
        skills_resp = (
            self.client.table("skill_profiles")
            .select("skill_name, total_tasks, avg_score")
            .order("avg_score", desc=True)
            .execute()
        )
        skill_profiles = [
            {
                "skill": row["skill_name"],
                "score": float(row["avg_score"]) if row["avg_score"] is not None else 0.0,
                "tasks_count": row["total_tasks"],
            }
            for row in (skills_resp.data or [])
        ]

        # 5. Recent completions (last 10, with project title and score)
        recent_raw = [t for t in completed_tasks if t.get("completed_at")][:10]
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
            "overall_score": avg_score,
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "completed_tasks": completed_count,
            "avg_task_score": avg_score,
            "skill_scores": skill_profiles,
            "recent_completions": recent_completions,
        }

    # ── get_insights ───────────────────────────────────────────────────

    async def get_insights(self, user_id: str, ai_service: AIService) -> dict:
        summary = await self.get_summary(user_id)
        return await ai_service.generate_insights(
            skill_scores=summary["skill_scores"],
            completed_tasks=summary["completed_tasks"],
            overall_score=summary["overall_score"],
        )

    async def apply_verification_penalty(self, task_id: str, user_id: str) -> None:
        """Reduce a scored task by 20% when its verification answer fails."""
        response = (
            self.client.table("performance_scores")
            .select("id, score, completion_time_score, difficulty_score, consistency_score")
            .eq("task_id", task_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return

        score = rows[0]
        updated = self.client.table("performance_scores").update({
            "score": round(float(score["score"]) * 0.8, 1),
            "completion_time_score": round(float(score["completion_time_score"]) * 0.8, 1),
            "difficulty_score": round(float(score["difficulty_score"]) * 0.8, 1),
            "consistency_score": round(float(score["consistency_score"]) * 0.8, 1),
        }).eq("id", score["id"]).execute()
        if not updated.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to apply the verification penalty.",
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
