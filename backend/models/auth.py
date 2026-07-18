from pydantic import BaseModel
from typing import Optional


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class SessionOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    full_name: str


class OAuthUrlOut(BaseModel):
    url: str


class AuthResponse(BaseModel):
    user: UserOut
    session: SessionOut
