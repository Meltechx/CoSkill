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


class UserXpOut(BaseModel):
    xp: int
    level: int
    xp_to_next_level: int
    badges: list[str]
    current_level_xp: int
    progress_percentage: int


class BadgeOut(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    unlocked: bool
    unlock_date: Optional[datetime] = None


class XpActivityOut(BaseModel):
    id: str
    amount: int
    event_type: str
    title: str
    created_at: datetime


class GamificationProfileOut(BaseModel):
    xp: int
    level: int
    current_level_xp: int
    xp_needed_for_next_level: int
    progress_percentage: int
    badges: list[BadgeOut]
    recent_activity: list[XpActivityOut]
    current_streak: int
    recent_achievements: list[BadgeOut]


class LeaderboardEntryOut(BaseModel):
    rank: int
    id: str
    full_name: str
    avatar_url: Optional[str] = None
    level: int
    xp: int
    badges: list[BadgeOut]
    completion_rate: int


class PublicProfileOut(BaseModel):
    """The intentionally limited data exposed on a shareable profile."""

    full_name: str
    skill_profiles: list[SkillScore]
    overall_score: float
    total_tasks: int
    completed_tasks: int
    level: int
    total_xp: int
    unlocked_badges: list[BadgeOut]
    completion_rate: int
    sprint_success_rate: int
    favorite_skill: Optional[str] = None
    current_streak: int
    recent_achievements: list[BadgeOut]
