from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials

from database import get_authenticated_client, supabase_admin
from dependencies import bearer_scheme, get_current_user, get_gamification_service
from models.user import GamificationProfileOut, LeaderboardEntryOut, PublicProfileOut, UserXpOut
from services.gamification_service import GamificationService
from services.user_service import UserService

router = APIRouter()


def get_authenticated_user_service(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UserService:
    return UserService(get_authenticated_client(credentials.credentials))


def get_public_user_service() -> UserService:
    return UserService(supabase_admin)


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


@router.get("/leaderboard", response_model=list[LeaderboardEntryOut])
async def get_demo_leaderboard(
    current_user=Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    return await gamification_service.get_leaderboard()


@router.get("/{user_id}/profile", response_model=PublicProfileOut)
async def get_public_profile(
    user_id: str,
    user_service: UserService = Depends(get_public_user_service),
):
    return await user_service.get_public_profile(user_id)
