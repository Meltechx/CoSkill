from datetime import datetime, timezone
from fastapi import HTTPException, status
from supabase import Client


MINIMUM_MINUTES = {
    "easy": 15,
    "medium": 45,
    "hard": 120,
    "expert": 240,
}


class TaskService:
    def __init__(self, client: Client):
        self.client = client

    async def _get_task_with_ownership(self, task_id: str, user_id: str) -> dict:
        """Fetch a task and verify it belongs to a project owned by user_id."""
        response = (
            self.client.table("tasks")
            .select("*, projects!inner(user_id)")
            .eq("id", task_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found.",
            )
        task = response.data
        if task["projects"]["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )
        return task

    async def list_tasks(self, project_id: str, user_id: str) -> list[dict]:
        # Verify the project belongs to the user first
        project_check = (
            self.client.table("projects")
            .select("id")
            .eq("id", project_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not project_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )

        response = (
            self.client.table("tasks")
            .select("*")
            .eq("project_id", project_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    async def complete_task(self, task_id: str, user_id: str) -> dict:
        task = await self._get_task_with_ownership(task_id, user_id)

        if task["status"] == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task is already completed.",
            )

        completed_at = datetime.now(timezone.utc)
        started_at = task.get("started_at")
        if started_at:
            start_time = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            minutes = max(0, int((completed_at - start_time).total_seconds() // 60))
        else:
            # A task finished without being started has no verifiable work duration.
            minutes = 0

        is_flagged = minutes < MINIMUM_MINUTES.get(task["difficulty"], MINIMUM_MINUTES["medium"])
        payload = {
            "status": "completed",
            "completed_at": completed_at.isoformat(),
            "time_spent_minutes": minutes,
            "is_flagged": is_flagged,
            "flag_reason": "Completed unusually fast" if is_flagged else None,
            "verification_question": None,
            "verification_answer": None,
        }
        response = (
            self.client.table("tasks")
            .update(payload)
            .eq("id", task_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to complete task.",
            )
        return response.data[0]

    async def start_task(self, task_id: str, user_id: str) -> dict:
        task = await self._get_task_with_ownership(task_id, user_id)
        if task["status"] == "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Completed tasks cannot be started.")

        response = (
            self.client.table("tasks")
            .update({"started_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", task_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to start task.")
        return response.data[0]

    async def set_verification_question(self, task_id: str, question: str) -> dict:
        response = self.client.table("tasks").update({"verification_question": question}).eq("id", task_id).execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save verification question.")
        return response.data[0]

    async def record_verification(self, task_id: str, user_id: str, answer: str, passed: bool) -> dict:
        task = await self._get_task_with_ownership(task_id, user_id)
        if not task.get("is_flagged"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This task is not under review.")

        response = (
            self.client.table("tasks")
            .update({
                "verification_answer": answer,
                "is_flagged": not passed,
                "flag_reason": None if passed else task.get("flag_reason") or "Verification not passed",
            })
            .eq("id", task_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save verification answer.")
        return response.data[0]

    async def bulk_create_tasks(self, project_id: str, tasks: list[dict]) -> list[dict]:
        payload = [
            {
                "project_id": project_id,
                "title": t["title"],
                "description": t.get("description"),
                "difficulty": t.get("difficulty", "medium"),
                "estimated_hours": t.get("estimated_hours"),
                "skill_tags": t.get("skill_tags", []),
                "status": "todo",
            }
            for t in tasks
        ]
        response = self.client.table("tasks").insert(payload).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save tasks to database.",
            )
        return response.data

    async def update_status(self, task_id: str, new_status: str, user_id: str) -> dict:
        await self._get_task_with_ownership(task_id, user_id)

        if new_status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use the complete endpoint so task timing can be verified.",
            )

        payload: dict = {"status": new_status}
        if new_status in ("todo", "in_progress", "cancelled"):
            payload["completed_at"] = None

        response = (
            self.client.table("tasks")
            .update(payload)
            .eq("id", task_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update task status.",
            )
        return response.data[0]
