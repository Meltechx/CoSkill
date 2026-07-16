from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database import get_authenticated_client, supabase_admin
from services.auth_service import AuthService
from services.ai_service import AIService
from services.project_service import ProjectService
from services.task_service import TaskService
from services.performance_service import PerformanceService

bearer_scheme = HTTPBearer()


def get_auth_service() -> AuthService:
    return AuthService(supabase_admin)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    auth_service: AuthService = Depends(get_auth_service),
):
    return await auth_service.get_user(credentials.credentials)


def get_project_service(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> ProjectService:
    return ProjectService(get_authenticated_client(credentials.credentials))


def get_task_service(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> TaskService:
    return TaskService(get_authenticated_client(credentials.credentials))


def get_ai_service() -> AIService:
    return AIService()


def get_performance_service(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> PerformanceService:
    return PerformanceService(get_authenticated_client(credentials.credentials))
