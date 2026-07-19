from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SkillScore(BaseModel):
    skill: str
    score: float
    tasks_count: int


class RecentCompletion(BaseModel):
    task_id: str
    task_title: str
    project_title: str
    completed_at: datetime
    score: Optional[float] = None
    difficulty: str
    skill_tags: list[str]


class PerformanceSummaryOut(BaseModel):
    overall_score: float
    total_projects: int
    total_tasks: int
    completed_tasks: int
    avg_task_score: float
    skill_scores: list[SkillScore]
    recent_completions: list[RecentCompletion]


class ScoreRequest(BaseModel):
    task_id: str


class ScoreOut(BaseModel):
    task_id: str
    score: float
    completion_time_score: float
    difficulty_score: float


class InsightsOut(BaseModel):
    strengths: list[str]
    improvements: list[str]
    next_skill: str
    summary: str


class JudgePitchOut(BaseModel):
    solution: str
    impact: str
    demo_flow: list[str]
    ai_use: str
    total_projects: int
    total_tasks: int
    completed_tasks: int
    skills_tracked: int
