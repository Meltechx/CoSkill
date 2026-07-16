from fastapi import APIRouter, Depends

from dependencies import get_current_user, get_performance_service, get_ai_service
from models.performance import PerformanceSummaryOut, ScoreRequest, ScoreOut, InsightsOut
from services.performance_service import PerformanceService
from services.ai_service import AIService

router = APIRouter()


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
):
    return await perf_service.get_insights(str(current_user.id), ai_service)
