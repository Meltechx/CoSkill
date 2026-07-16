from fastapi import APIRouter, Depends, status

from dependencies import get_current_user, get_task_service
from models.task import TaskOut, TaskStatusUpdate
from services.task_service import TaskService

router = APIRouter()


@router.post("/{task_id}/complete", response_model=TaskOut)
async def complete_task(
    task_id: str,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    return await task_service.complete_task(task_id, str(current_user.id))


@router.patch("/{task_id}/status", response_model=TaskOut)
async def update_task_status(
    task_id: str,
    body: TaskStatusUpdate,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    return await task_service.update_status(task_id, body.status.value, str(current_user.id))
