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


class UserSearchOut(BaseModel):
    id: str
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    team_role: str = "other"
    experience_level: str = "mid"
    skills: list[str] = []
    bio: Optional[str] = None
    is_available: bool = True


class PublicProfileOut(BaseModel):
    """The intentionally limited data exposed on a shareable profile."""

    full_name: str
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    team_role: str = "other"
    experience_level: str = "mid"
    skills: list[str] = []
    skill_profiles: list[SkillScore]
    overall_score: float
    total_tasks: int
    completed_tasks: int
    total_projects: int
    level: int
    total_xp: int
    unlocked_badges: list[BadgeOut]
    completion_rate: int
    sprint_success_rate: int
    favorite_skill: Optional[str] = None
    current_streak: int
    recent_achievements: list[BadgeOut]


class TeamProfileUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[list[str]] = None
    technologies: Optional[list[str]] = None
    experience_level: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    work_preferences: Optional[list[str]] = None
    team_role: Optional[str] = None
    is_available: Optional[bool] = None


class TeamProfileOut(BaseModel):
    id: str
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    skills: list[str] = []
    technologies: list[str] = []
    experience_level: str = "mid"
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    work_preferences: list[str] = []
    team_role: str = "other"
    is_available: bool = True
    level: int = 1
    xp: int = 0


class TeamMatchOut(BaseModel):
    user: TeamProfileOut
    compatibility: int
    explanation: str


class UsernameAvailabilityOut(BaseModel):
    available: bool


class DashboardAssistantRequest(BaseModel):
    message: str


class DashboardAssistantOut(BaseModel):
    reply: str
