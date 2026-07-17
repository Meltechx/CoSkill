from fastapi import APIRouter, Depends

from database import supabase_admin
from models.user import PublicProfileOut
from services.user_service import UserService

router = APIRouter()


def get_user_service() -> UserService:
    # This route is deliberately public, so use the trusted server client to
    # read aggregate data without weakening the database's user RLS policies.
    return UserService(supabase_admin)


@router.get("/{user_id}/profile", response_model=PublicProfileOut)
async def get_public_profile(
    user_id: str,
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.get_public_profile(user_id)
