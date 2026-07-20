from pydantic import BaseModel, Field
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


class SprintRequest(BaseModel):
    duration_hours: float = Field(gt=0, le=168)
    team_size: int = Field(gt=0, le=20)


class SprintTaskAssignment(BaseModel):
    task_id: str
    title: str
    assignee: str
    estimated_hours: float
    priority: str
    ai_reason: str
    depends_on: list[str]
    blocks: list[str]


class SprintPhaseOut(BaseModel):
    time_range: str
    focus: str
    tasks: list[SprintTaskAssignment]


class SprintPlanOut(BaseModel):
    phases: list[SprintPhaseOut]
    sprint_goal: str
    risk_level: str
    risk_reason: str
    completion_probability: int
    recommendations: list[str]
