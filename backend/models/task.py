from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class TaskDifficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
    expert = "expert"


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    difficulty: TaskDifficulty = TaskDifficulty.medium
    estimated_hours: Optional[float] = None
    skill_tags: list[str] = []


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskVerificationRequest(BaseModel):
    verification_answer: str


class TaskOut(BaseModel):
    id: str
    project_id: str
    title: str
    description: Optional[str] = None
    difficulty: TaskDifficulty
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    status: TaskStatus
    skill_tags: list[str]
    created_at: datetime
    completed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    time_spent_minutes: Optional[int] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    verification_question: Optional[str] = None
    verification_answer: Optional[str] = None

    class Config:
        from_attributes = True
