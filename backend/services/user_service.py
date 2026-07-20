from fastapi import HTTPException, status
from supabase import Client

from services.gamification_service import GamificationService


class UserService:
    def __init__(self, client: Client):
        self.client = client

    async def get_xp_status(self, user_id: str, email: str | None = None, full_name: str | None = None) -> dict:
        xp = await GamificationService(self.client).get_xp_status(user_id, email, full_name)
        return {
            "xp": xp["xp"],
            "level": xp["level"],
            "xp_to_next_level": xp["xp_needed_for_next_level"],
            "current_level_xp": xp["current_level_xp"],
            "progress_percentage": xp["progress_percentage"],
            "badges": xp["badges"],
        }

    async def update_team_profile(self, user_id: str, data: dict) -> dict:
        payload = {k: v for k, v in data.items() if v is not None}
        if not payload:
            return await self.get_team_profile(user_id)
        response = (
            self.client.table("users")
            .update(payload)
            .eq("id", user_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update team profile.",
            )
        return self._format_team_profile(response.data[0])

    async def get_team_profile(self, user_id: str) -> dict:
        response = (
            self.client.table("users")
            .select("id, full_name, avatar_url, bio, skills, technologies, experience_level, github_url, linkedin_url, work_preferences, team_role, is_available, level, xp")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return self._format_team_profile(response.data)

    async def get_available_candidates(self, exclude_user_id: str) -> list[dict]:
        response = (
            self.client.table("users")
            .select("id, full_name, avatar_url, bio, skills, technologies, experience_level, github_url, linkedin_url, work_preferences, team_role, is_available, level, xp")
            .eq("is_available", True)
            .neq("id", exclude_user_id)
            .execute()
        )
        return [self._format_team_profile(r) for r in (response.data or [])]

    def _format_team_profile(self, row: dict) -> dict:
        return {
            "id": row["id"],
            "full_name": row.get("full_name"),
            "avatar_url": row.get("avatar_url"),
            "bio": row.get("bio"),
            "skills": row.get("skills") or [],
            "technologies": row.get("technologies") or [],
            "experience_level": row.get("experience_level") or "mid",
            "github_url": row.get("github_url"),
            "linkedin_url": row.get("linkedin_url"),
            "work_preferences": row.get("work_preferences") or [],
            "team_role": row.get("team_role") or "other",
            "is_available": row.get("is_available", True),
            "level": row.get("level") or 1,
            "xp": row.get("xp") or 0,
        }

    async def get_public_profile(self, user_id: str) -> dict:
        """Return only the aggregate data that is safe to share publicly."""
        user_response = (
            self.client.table("users")
            .select("full_name")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        users = user_response.data or []
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found.",
            )

        tasks_response = (
            self.client.table("tasks")
            .select("id, status, projects!inner(user_id)")
            .eq("projects.user_id", user_id)
            .execute()
        )
        tasks = tasks_response.data or []

        scores_response = (
            self.client.table("performance_scores")
            .select("score")
            .eq("user_id", user_id)
            .execute()
        )
        scores = [float(row["score"]) for row in (scores_response.data or [])]

        skills_response = (
            self.client.table("skill_profiles")
            .select("skill_name, total_tasks, avg_score")
            .eq("user_id", user_id)
            .order("avg_score", desc=True)
            .execute()
        )

        public_stats = await GamificationService(self.client).get_public_stats(user_id)
        return {
            "full_name": users[0]["full_name"],
            "skill_profiles": [
                {
                    "skill": row["skill_name"],
                    "score": float(row["avg_score"]) if row["avg_score"] is not None else 0.0,
                    "tasks_count": row["total_tasks"],
                }
                for row in (skills_response.data or [])
            ],
            "overall_score": round(sum(scores) / len(scores), 1) if scores else 0.0,
            "total_tasks": len(tasks),
            "completed_tasks": sum(task["status"] == "completed" for task in tasks),
            **public_stats,
        }
