from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from dependencies import get_auth_service, get_current_user
from models.auth import AuthResponse, LoginRequest, RegisterRequest, SessionOut, UserOut
from services.auth_service import AuthService

router = APIRouter()
bearer_scheme = HTTPBearer()


def _build_user_out(user) -> UserOut:
    return UserOut(
        id=str(user.id),
        email=user.email,
        full_name=(user.user_metadata or {}).get("full_name"),
    )


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(
    body: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    response = await auth_service.register(body.email, body.password, body.full_name)
    session = response.session
    return AuthResponse(
        user=_build_user_out(response.user),
        session=SessionOut(
            access_token=session.access_token if session else "",
            refresh_token=session.refresh_token if session else "",
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    response = await auth_service.login(body.email, body.password)
    return AuthResponse(
        user=_build_user_out(response.user),
        session=SessionOut(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
        ),
    )


@router.post("/logout", status_code=204)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    auth_service: AuthService = Depends(get_auth_service),
):
    await auth_service.logout(credentials.credentials)


@router.get("/me", response_model=UserOut)
async def me(current_user=Depends(get_current_user)):
    return _build_user_out(current_user)
