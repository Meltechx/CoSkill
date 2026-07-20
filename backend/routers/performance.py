from fastapi import APIRouter, Depends

import logging

from dependencies import get_current_user, get_performance_service, get_ai_service, get_gamification_service
from models.performance import PerformanceSummaryOut, ScoreRequest, ScoreOut, InsightsOut, JudgePitchOut
from services.performance_service import PerformanceService
from services.ai_service import AIService
from services.gamification_service import GamificationService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/summary", response_model=PerformanceSummaryOut)
async def get_performance_summary(
    current_user=Depends(get_current_user),
    perf_service: PerformanceService = Depends(get_performance_service),
):
    return await perf_service.get_summary(str(current_user.id))


@router.post("/score", response_model=ScoreOut)
async def score_task(
    body: ScoreRequest,
    current_user=Depends(get_current_user),
    perf_service: PerformanceService = Depends(get_performance_service),
):
    return await perf_service.score_task(body.task_id, str(current_user.id))


@router.get("/insights", response_model=InsightsOut)
async def get_ai_insights(
    current_user=Depends(get_current_user),
    perf_service: PerformanceService = Depends(get_performance_service),
    ai_service: AIService = Depends(get_ai_service),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    insights = await perf_service.get_insights(str(current_user.id), ai_service)
    try:
        await gamification_service.award_ai_xp(str(current_user.id), "ai_insights", "Used AI Insights", 10)
    except Exception as error:
        logger.warning("Could not award AI insights XP: %s", error)
    return insights


@router.post("/judge-pitch", response_model=JudgePitchOut)
async def generate_judge_pitch(
    current_user=Depends(get_current_user),
    perf_service: PerformanceService = Depends(get_performance_service),
    ai_service: AIService = Depends(get_ai_service),
):
    summary = await perf_service.get_summary(str(current_user.id))
    stats = {
        "total_projects": summary["total_projects"],
        "total_tasks": summary["total_tasks"],
        "completed_tasks": summary["completed_tasks"],
        "skills_tracked": len(summary["skill_scores"]),
    }
    pitch = await ai_service.generate_judge_pitch(stats)
    return {**pitch, **stats}
