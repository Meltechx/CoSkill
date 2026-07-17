from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from models.performance import SkillScore


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None


class UserOut(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PublicProfileOut(BaseModel):
    """The intentionally limited data exposed on a shareable profile."""

    full_name: str
    skill_profiles: list[SkillScore]
    overall_score: float
    total_tasks: int
    completed_tasks: int
