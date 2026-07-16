from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PerformanceMetrics(BaseModel):
    user_id: str
    tasks_completed: int
    tasks_on_time: int
    avg_completion_time_hours: float
    performance_score: float
    period_start: datetime
    period_end: datetime


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    full_name: str
    performance_score: float
    tasks_completed: int


class AIInsight(BaseModel):
    user_id: str
    summary: str
    strengths: list[str]
    areas_for_improvement: list[str]
    generated_at: datetime
