from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials

from database import get_authenticated_client, supabase_admin
from dependencies import bearer_scheme, get_ai_service, get_current_user, get_gamification_service, get_project_service, get_task_service
from models.user import DashboardAssistantOut, DashboardAssistantRequest, GamificationProfileOut, LeaderboardEntryOut, PublicProfileOut, TeamProfileOut, TeamProfileUpdate, UsernameAvailabilityOut, UserSearchOut, UserXpOut
from services.ai_service import AIService
from services.project_service import ProjectService
from services.task_service import TaskService
from services.gamification_service import GamificationService
from services.user_service import UserService

router = APIRouter()


def get_authenticated_user_service(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UserService:
    return UserService(get_authenticated_client(credentials.credentials))


def get_public_user_service() -> UserService:
    return UserService(supabase_admin)


@router.get("/me/team-profile", response_model=TeamProfileOut)
async def get_my_team_profile(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_public_user_service),
):
    return await user_service.get_team_profile(str(current_user.id))


@router.put("/me/team-profile", response_model=TeamProfileOut)
async def update_my_team_profile(
    body: TeamProfileUpdate,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_public_user_service),
):
    return await user_service.update_team_profile(str(current_user.id), body.model_dump(exclude_unset=True))


@router.get("/me/xp", response_model=UserXpOut)
async def get_my_xp(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_authenticated_user_service),
):
    metadata = current_user.user_metadata or {}
    return await user_service.get_xp_status(
        str(current_user.id),
        current_user.email,
        metadata.get("full_name"),
    )


@router.get("/me/gamification", response_model=GamificationProfileOut)
async def get_my_gamification_profile(
    current_user=Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    metadata = current_user.user_metadata or {}
    return await gamification_service.get_profile(
        str(current_user.id),
        current_user.email,
        metadata.get("full_name"),
    )


@router.post("/me/assistant", response_model=DashboardAssistantOut)
async def dashboard_assistant(
    body: DashboardAssistantRequest,
    current_user=Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
    task_service: TaskService = Depends(get_task_service),
    ai_service: AIService = Depends(get_ai_service),
):
    message = body.message.strip()
    if not message:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A message is required.")
    user_id = str(current_user.id)
    projects = await project_service.list_projects(user_id)
    tasks = []
    for project in projects:
        tasks.extend(await task_service.list_tasks(project["id"], user_id))
    return {"reply": await ai_service.chat_about_dashboard(projects, tasks, message)}


@router.get("/leaderboard", response_model=list[LeaderboardEntryOut])
async def get_demo_leaderboard(
    current_user=Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    return await gamification_service.get_leaderboard()


@router.get("/search", response_model=list[UserSearchOut])
async def search_users(
    q: str = Query(..., min_length=1, max_length=100),
    user_service: UserService = Depends(get_public_user_service),
):
    return await user_service.search_users(q)


@router.get("/check-username", response_model=UsernameAvailabilityOut)
async def check_username(
    username: str = Query(..., min_length=1, max_length=20),
    user_service: UserService = Depends(get_public_user_service),
):
    return {"available": await user_service.is_username_available(username)}


@router.get("/{username}/profile", response_model=PublicProfileOut)
async def get_public_profile(
    username: str,
    user_service: UserService = Depends(get_public_user_service),
):
    return await user_service.get_public_profile(username)
