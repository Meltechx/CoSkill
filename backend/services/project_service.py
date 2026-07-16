from datetime import datetime, timezone
from fastapi import HTTPException, status
from supabase import Client


class ProjectService:
    def __init__(self, client: Client):
        self.client = client

    def _row_to_dict(self, row: dict) -> dict:
        return row

    async def list_projects(self, user_id: str) -> list[dict]:
        response = (
            self.client.table("projects")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    async def create_project(self, user_id: str, data: dict) -> dict:
        payload = {
            "user_id": user_id,
            "title": data["title"],
            "description": data.get("description"),
            "goal": data.get("goal"),
            "status": "active",
            "deadline": data["deadline"].isoformat() if data.get("deadline") else None,
        }
        response = self.client.table("projects").insert(payload).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create project.",
            )
        return response.data[0]

    async def get_project(self, project_id: str, user_id: str) -> dict:
        response = (
            self.client.table("projects")
            .select("*")
            .eq("id", project_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )
        return response.data

    async def delete_project(self, project_id: str, user_id: str) -> None:
        # Verify ownership before deleting
        await self.get_project(project_id, user_id)
        self.client.table("projects").delete().eq("id", project_id).execute()
