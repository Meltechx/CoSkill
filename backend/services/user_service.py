import re

from fastapi import HTTPException, status
from supabase import Client

from services.gamification_service import GamificationService


class UserService:
    USERNAME_PATTERN = re.compile(r"^[a-z0-9_]{3,20}$")

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
        if "username" in payload:
            payload["username"] = self._normalize_username(payload["username"])
        if not payload:
            return await self.get_team_profile(user_id)
        try:
            response = (
                self.client.table("users")
                .update(payload)
                .eq("id", user_id)
                .execute()
            )
        except Exception as exc:
            if "duplicate key" in str(exc).lower() or "23505" in str(exc):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That username is already taken.")
            raise
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update team profile.",
            )
        return self._format_team_profile(response.data[0])

    async def get_team_profile(self, user_id: str) -> dict:
        response = (
            self.client.table("users")
            .select("id, full_name, username, avatar_url, bio, skills, technologies, experience_level, github_url, linkedin_url, work_preferences, team_role, is_available, level, xp")
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
            .select("id, full_name, username, avatar_url, bio, skills, technologies, experience_level, github_url, linkedin_url, work_preferences, team_role, is_available, level, xp")
            .eq("is_available", True)
            .neq("id", exclude_user_id)
            .execute()
        )
        return [self._format_team_profile(r) for r in (response.data or [])]

    def _format_team_profile(self, row: dict) -> dict:
        return {
            "id": row["id"],
            "full_name": row.get("full_name"),
            "username": row.get("username"),
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

    async def search_users(self, query: str) -> list[dict]:
        response = (
            self.client.table("users")
            .select("id, full_name, username, avatar_url, team_role, experience_level, skills, bio, is_available")
            .eq("is_available", True)
            .or_(f"username.ilike.%{query}%,full_name.ilike.%{query}%")
            .limit(20)
            .execute()
        )
        return [
            {
                "id": row["id"],
                "full_name": row.get("full_name"),
                "username": row.get("username"),
                "avatar_url": row.get("avatar_url"),
                "team_role": row.get("team_role") or "other",
                "experience_level": row.get("experience_level") or "mid",
                "skills": row.get("skills") or [],
                "bio": row.get("bio"),
                "is_available": True,
            }
            for row in (response.data or [])
        ]

    async def is_username_available(self, username: str) -> bool:
        try:
            normalized = self._normalize_username(username)
        except HTTPException:
            return False
        response = self.client.table("users").select("id").eq("username", normalized).limit(1).execute()
        return not bool(response.data)

    async def get_public_profile(self, username: str) -> dict:
        username = self._normalize_username(username)
        user_response = (
            self.client.table("users")
            .select("id, full_name, username, avatar_url, bio, team_role, experience_level, skills, is_available")
            .eq("username", username)
            .limit(1)
            .execute()
        )
        users = user_response.data or []
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found.",
            )

        u = users[0]
        user_id = u["id"]
        if not u.get("is_available", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This profile is not public.",
            )

        tasks_response = (
            self.client.table("tasks")
            .select("id, status, projects!inner(user_id)")
            .eq("projects.user_id", user_id)
            .execute()
        )
        tasks = tasks_response.data or []

        projects_response = (
            self.client.table("projects")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )

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
            "full_name": u["full_name"],
            "username": u["username"],
            "avatar_url": u.get("avatar_url"),
            "bio": u.get("bio"),
            "team_role": u.get("team_role") or "other",
            "experience_level": u.get("experience_level") or "mid",
            "skills": u.get("skills") or [],
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
            "total_projects": len(projects_response.data or []),
            **public_stats,
        }

    def _normalize_username(self, username: str) -> str:
        normalized = username.strip().lower()
        if not self.USERNAME_PATTERN.fullmatch(normalized):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Username must be 3–20 characters using only letters, numbers, or underscores.",
            )
        return normalized
