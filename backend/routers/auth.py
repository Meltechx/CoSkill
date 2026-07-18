from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from dependencies import get_auth_service, get_current_user
from models.auth import AuthResponse, LoginRequest, RegisterRequest, SessionOut, UserOut, ProfileUpdateRequest, OAuthUrlOut
from services.auth_service import AuthService

router = APIRouter()
bearer_scheme = HTTPBearer()


def _build_user_out(user) -> UserOut:
    return UserOut(
        id=str(user.id),
        email=user.email,
        full_name=(user.user_metadata or {}).get("full_name"),
        avatar_url=(user.user_metadata or {}).get("avatar_url"),
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


@router.get("/google", response_model=OAuthUrlOut)
async def google_oauth(auth_service: AuthService = Depends(get_auth_service)):
    return {"url": await auth_service.google_oauth_url()}


@router.put("/me", response_model=UserOut)
async def update_me(body: ProfileUpdateRequest, current_user=Depends(get_current_user), auth_service: AuthService = Depends(get_auth_service)):
    update = await auth_service.update_profile(str(current_user.id), body.full_name)
    user = _build_user_out(current_user)
    user.full_name = update["full_name"]
    return user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(file: UploadFile = File(...), current_user=Depends(get_current_user), auth_service: AuthService = Depends(get_auth_service)):
    avatar_url = await auth_service.upload_avatar(str(current_user.id), file.filename or "avatar.jpg", await file.read(), file.content_type)
    user = _build_user_out(current_user)
    user.avatar_url = avatar_url
    return user
