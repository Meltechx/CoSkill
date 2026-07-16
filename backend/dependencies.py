from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import supabase_admin
from services.auth_service import AuthService
from services.project_service import ProjectService
from services.task_service import TaskService

bearer_scheme = HTTPBearer()


def get_auth_service() -> AuthService:
    return AuthService(supabase_admin)


def get_project_service() -> ProjectService:
    return ProjectService(supabase_admin)


def get_task_service() -> TaskService:
    return TaskService(supabase_admin)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    auth_service: AuthService = Depends(get_auth_service),
):
    return await auth_service.get_user(credentials.credentials)
