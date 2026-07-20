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
