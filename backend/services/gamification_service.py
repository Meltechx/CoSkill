import logging

from fastapi import HTTPException, status
from supabase import Client

logger = logging.getLogger(__name__)


BADGES = {
    "first_project": ("First Project", "Created your first project.", "🏗"),
    "fast_finisher": ("Fast Finisher", "Completed a task in a focused burst.", "⚡"),
    "ship_it": ("Ship It", "Completed 10 tasks.", "🚀"),
    "ai_explorer": ("AI Explorer", "Used an AI-powered CoSkill feature.", "🤖"),
    "seven_day_streak": ("7 Day Streak", "Stayed active for seven consecutive days.", "🔥"),
    "sprint_master": ("Sprint Master", "Completed an entire sprint.", "🎯"),
    "hundred_tasks": ("100 Tasks Completed", "Completed 100 tasks.", "💯"),
    "ai_power_user": ("AI Power User", "Used AI features 10 times.", "🧠"),
    "consistency": ("Consistency", "Completed 30 tasks.", "🛡"),
    "early_bird": ("Early Bird", "Completed work before 9 AM UTC.", "⭐"),
}


def calculate_level(xp: int) -> dict:
    xp = max(0, int(xp))
    thresholds = [(1, 0, 250), (2, 250, 600), (3, 600, 1000), (4, 1000, 1500)]
    for level, start, next_xp in thresholds:
        if xp < next_xp:
            return {
                "level": level,
                "current_level_xp": xp - start,
                "xp_needed_for_next_level": next_xp - xp,
                "progress_percentage": round((xp - start) / (next_xp - start) * 100),
            }
    level = 5 + (xp - 1500) // 500
    start = 1500 + (level - 5) * 500
    return {
        "level": level,
        "current_level_xp": xp - start,
        "xp_needed_for_next_level": start + 500 - xp,
        "progress_percentage": round((xp - start) / 500 * 100),
    }


def default_xp_status() -> dict:
    return {"xp": 0, **calculate_level(0), "badges": []}


class GamificationService:
    def __init__(self, client: Client):
        self.client = client

    async def award_ai_xp(self, user_id: str, event_type: str, title: str, amount: int) -> None:
        try:
            self.client.rpc("award_gamification_xp", {
                "p_user_id": user_id,
                "p_amount": amount,
                "p_event_type": event_type,
                "p_title": title,
                "p_metadata": {},
            }).execute()
        except Exception:
            logger.exception("Unable to award gamification XP for user %s", user_id)
            raise

    @staticmethod
    def _storage_error(operation: str) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Gamification storage is unavailable while {operation}. "
                "Apply migrations 005_xp_system.sql, 006_gamification_system.sql, and "
                "007_gamification_profile_bootstrap.sql, then verify the Supabase connection."
            ),
        )

    async def _ensure_user_record(self, user_id: str, email: str | None, full_name: str | None) -> None:
        if not email:
            return
        try:
            self.client.rpc("ensure_gamification_user", {
                "p_user_id": user_id,
                "p_email": email,
                "p_full_name": full_name or email.split("@", 1)[0] or "CoSkill member",
            }).execute()
        except Exception:
            logger.exception("Unable to bootstrap gamification user record for user %s", user_id)
            raise self._storage_error("creating the default user record")

    async def get_xp_status(self, user_id: str, email: str | None = None, full_name: str | None = None) -> dict:
        try:
            response = self.client.table("users").select("xp, level, badges").eq("id", user_id).limit(1).execute()
        except Exception:
            logger.exception("Unable to load XP status for user %s", user_id)
            raise self._storage_error("loading XP status")

        rows = response.data or []
        if not rows:
            await self._ensure_user_record(user_id, email, full_name)
            try:
                response = self.client.table("users").select("xp, level, badges").eq("id", user_id).limit(1).execute()
                rows = response.data or []
            except Exception:
                logger.exception("Unable to read bootstrapped XP status for user %s", user_id)
                raise self._storage_error("loading the default XP status")

        if not rows:
            # A missing profile must never turn the XP endpoint into a 500.
            # The bootstrap migration persists this record when it is installed.
            return default_xp_status()

        user = rows[0]
        try:
            xp = max(0, int(user.get("xp") or 0))
        except (TypeError, ValueError):
            logger.warning("Invalid XP value for user %s; using zero", user_id)
            xp = 0
        badges = user.get("badges") or []
        return {"xp": xp, **calculate_level(xp), "badges": [badge for badge in badges if isinstance(badge, str)]}

    def _badge(self, row: dict, unlocked_ids: set[str]) -> dict:
        badge_id = row.get("badge_id") or row.get("id")
        title, description, icon = BADGES.get(badge_id, (badge_id.replace("_", " ").title(), "Achievement unlocked.", "✦"))
        return {
            "id": badge_id,
            "title": title,
            "description": description,
            "icon": icon,
            "unlocked": badge_id in unlocked_ids,
            "unlock_date": row.get("unlocked_at"),
        }

    async def get_profile(self, user_id: str, email: str | None = None, full_name: str | None = None) -> dict:
        xp_status = await self.get_xp_status(user_id, email, full_name)
        try:
            badge_response = self.client.table("user_badges").select("badge_id, unlocked_at").eq("user_id", user_id).order("unlocked_at", desc=True).execute()
            badge_rows = badge_response.data or []
            events_response = self.client.table("xp_events").select("id, amount, event_type, title, created_at").eq("user_id", user_id).order("created_at", desc=True).limit(12).execute()
            events = events_response.data or []
            streak_response = self.client.rpc("current_gamification_streak", {"p_user_id": user_id}).execute()
            streak = max(0, int(streak_response.data or 0))
        except Exception:
            logger.exception("Unable to load gamification activity for user %s", user_id)
            raise self._storage_error("loading gamification activity")

        badge_by_id = {row["badge_id"]: row for row in badge_rows if row.get("badge_id")}
        badges = [self._badge(badge_by_id.get(badge_id, {"badge_id": badge_id}), set(badge_by_id)) for badge_id in BADGES]
        return {
            "xp": xp_status["xp"],
            "level": xp_status["level"],
            "current_level_xp": xp_status["current_level_xp"],
            "xp_needed_for_next_level": xp_status["xp_needed_for_next_level"],
            "progress_percentage": xp_status["progress_percentage"],
            "badges": badges,
            "recent_activity": events,
            "current_streak": streak,
            "recent_achievements": [self._badge(row, set(badge_by_id)) for row in badge_rows[:5]],
        }

    async def get_leaderboard(self, limit: int = 10) -> list[dict]:
        users_response = self.client.table("users").select("id, full_name, avatar_url, xp, badges").order("xp", desc=True).limit(limit).execute()
        rows = users_response.data or []
        task_response = self.client.table("tasks").select("status, projects!inner(user_id)").execute()
        task_counts: dict[str, list[int]] = {}
        for task in task_response.data or []:
            project = task.get("projects") or {}
            user_id = project.get("user_id")
            if not user_id:
                continue
            total, completed = task_counts.get(user_id, [0, 0])
            task_counts[user_id] = [total + 1, completed + (1 if task.get("status") == "completed" else 0)]
        leaderboard = []
        for rank, user in enumerate(rows, start=1):
            total, completed = task_counts.get(user["id"], [0, 0])
            progression = calculate_level(int(user.get("xp") or 0))
            leaderboard.append({
                "rank": rank,
                "id": user["id"],
                "full_name": user.get("full_name") or "CoSkill member",
                "avatar_url": user.get("avatar_url"),
                "level": progression["level"],
                "xp": int(user.get("xp") or 0),
                "badges": [self._badge({"badge_id": badge_id}, set(user.get("badges") or [])) for badge_id in (user.get("badges") or [])[:3]],
                "completion_rate": round(completed / total * 100) if total else 0,
            })
        return leaderboard

    async def get_public_stats(self, user_id: str) -> dict:
        profile = await self.get_profile(user_id)
        tasks_response = self.client.table("tasks").select("status, skill_tags, projects!inner(user_id)").eq("projects.user_id", user_id).execute()
        tasks = tasks_response.data or []
        completed = sum(task.get("status") == "completed" for task in tasks)
        skill_counts: dict[str, int] = {}
        for task in tasks:
            for skill in task.get("skill_tags") or []:
                skill_counts[skill] = skill_counts.get(skill, 0) + 1
        favorite_skill = max(skill_counts, key=skill_counts.get) if skill_counts else None
        return {
            "level": profile["level"],
            "total_xp": profile["xp"],
            "unlocked_badges": [badge for badge in profile["badges"] if badge["unlocked"]],
            "completion_rate": round(completed / len(tasks) * 100) if tasks else 0,
            "sprint_success_rate": 0,
            "favorite_skill": favorite_skill,
            "current_streak": profile["current_streak"],
            "recent_achievements": profile["recent_achievements"],
        }
