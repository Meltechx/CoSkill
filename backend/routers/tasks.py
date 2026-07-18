import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile

from dependencies import get_ai_service, get_current_user, get_task_service, get_performance_service
from models.task import TaskOut, TaskStatusUpdate, TaskVerificationRequest, TaskChatRequest, TaskChatOut
from services.ai_service import AIService
from services.task_service import TaskService
from services.performance_service import PerformanceService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: str,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    return await task_service._get_task_with_ownership(task_id, str(current_user.id))


@router.post("/{task_id}/complete", response_model=TaskOut)
async def complete_task(
    task_id: str,
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
    perf_service: PerformanceService = Depends(get_performance_service),
    ai_service: AIService = Depends(get_ai_service),
):
    task_data = await task_service._get_task_with_ownership(task_id, str(current_user.id))

    file_summaries = []
    for f in files:
        content = await f.read()
        preview = ""
        try:
            text = content.decode("utf-8", errors="replace")
            preview = text[:500]
        except Exception:
            preview = "(binary file)"
        file_summaries.append(f"{f.filename} ({f.content_type or 'unknown'}) — {preview}")

    relevant = await ai_service.analyze_file_relevance(
        task_data["title"], task_data.get("description"), file_summaries
    )
    if not relevant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your uploaded files don't seem related to this task. Please upload relevant proof of your work.",
        )

    task = await task_service.complete_task(task_id, str(current_user.id))
    try:
        await perf_service.score_task(task_id, str(current_user.id))
    except Exception as e:
        logger.warning("Performance scoring failed for task %s: %s", task_id, e)
    if task["is_flagged"]:
        question = await ai_service.generate_verification_question(task["title"], task.get("description"))
        task = await task_service.set_verification_question(task_id, question)
    return task


@router.post("/{task_id}/start", response_model=TaskOut)
async def start_task(
    task_id: str,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    return await task_service.start_task(task_id, str(current_user.id))


@router.post("/{task_id}/verify", response_model=TaskOut)
async def verify_task(
    task_id: str,
    body: TaskVerificationRequest,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
    perf_service: PerformanceService = Depends(get_performance_service),
    ai_service: AIService = Depends(get_ai_service),
):
    answer = body.verification_answer.strip()
    if not answer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification answer is required.")

    task = await task_service._get_task_with_ownership(task_id, str(current_user.id))
    if not task.get("is_flagged"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This task is not under review.")
    question = task.get("verification_question") or "Explain how you completed this task."
    verification_score = await ai_service.evaluate_verification_answer(
        task["title"], task.get("description"), question, answer
    )
    passed = verification_score >= 5
    if not passed:
        await perf_service.apply_verification_penalty(task_id, str(current_user.id))
    return await task_service.record_verification(task_id, str(current_user.id), answer, passed)


@router.post("/{task_id}/chat", response_model=TaskChatOut)
async def chat_about_task(
    task_id: str,
    body: TaskChatRequest,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
    ai_service: AIService = Depends(get_ai_service),
):
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A chat message is required.")
    task = await task_service._get_task_with_ownership(task_id, str(current_user.id))
    return {"reply": await ai_service.chat_about_task(task["title"], task.get("description"), task["difficulty"], message)}


@router.patch("/{task_id}/status", response_model=TaskOut)
async def update_task_status(
    task_id: str,
    body: TaskStatusUpdate,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    return await task_service.update_status(task_id, body.status.value, str(current_user.id))
