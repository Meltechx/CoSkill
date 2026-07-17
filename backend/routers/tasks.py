import logging

from fastapi import APIRouter, Depends

from dependencies import get_current_user, get_task_service, get_performance_service
from models.task import TaskOut, TaskStatusUpdate
from services.task_service import TaskService
from services.performance_service import PerformanceService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{task_id}/complete", response_model=TaskOut)
async def complete_task(
    task_id: str,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
    perf_service: PerformanceService = Depends(get_performance_service),
):
    task = await task_service.complete_task(task_id, str(current_user.id))
    try:
        await perf_service.score_task(task_id, str(current_user.id))
    except Exception as e:
        # Scoring is non-critical — log and continue so task completion always succeeds
        logger.warning("Performance scoring failed for task %s: %s", task_id, e)
    return task


@router.patch("/{task_id}/status", response_model=TaskOut)
async def update_task_status(
    task_id: str,
    body: TaskStatusUpdate,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    return await task_service.update_status(task_id, body.status.value, str(current_user.id))
