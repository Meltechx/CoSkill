from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class ProjectStatus(str, Enum):
    active = "active"
    completed = "completed"
    archived = "archived"
    paused = "paused"


class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    goal: Optional[str] = None
    deadline: Optional[datetime] = None


class ProjectOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    goal: Optional[str] = None
    status: ProjectStatus
    deadline: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectRiskOut(BaseModel):
    overall_score: int
    risk_level: str
    category_scores: dict[str, int]
    reasons: list[str]
    recommendations: list[str]
    summary: str
