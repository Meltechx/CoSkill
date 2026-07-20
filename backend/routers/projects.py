import logging

from fastapi import APIRouter, Depends, status

from dependencies import get_ai_service, get_current_user, get_gamification_service, get_project_service, get_task_service
from models.project import ProjectCreate, ProjectOut, SprintPlanOut, SprintRequest
from models.task import TaskOut
from services.ai_service import AIService
from services.project_service import ProjectService
from services.task_service import TaskService
from services.gamification_service import GamificationService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    current_user=Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    return await project_service.create_project(str(current_user.id), body.model_dump())


@router.get("/", response_model=list[ProjectOut])
async def list_projects(
    current_user=Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    return await project_service.list_projects(str(current_user.id))


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    current_user=Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    return await project_service.get_project(project_id, str(current_user.id))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user=Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    await project_service.delete_project(project_id, str(current_user.id))


@router.get("/{project_id}/tasks", response_model=list[TaskOut])
async def list_project_tasks(
    project_id: str,
    current_user=Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    return await task_service.list_tasks(project_id, str(current_user.id))


@router.post("/{project_id}/sprint", response_model=SprintPlanOut)
async def plan_sprint(
    project_id: str,
    body: SprintRequest,
    current_user=Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
    task_service: TaskService = Depends(get_task_service),
    ai_service: AIService = Depends(get_ai_service),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    project = await project_service.get_project(project_id, str(current_user.id))
    tasks = await task_service.list_tasks(project_id, str(current_user.id))
    plan = await ai_service.plan_sprint(project, tasks, body.duration_hours, body.team_size)
    try:
        await gamification_service.award_ai_xp(str(current_user.id), "ai_sprint_generated", "Generated Sprint Timeline", 20)
    except Exception as error:
        logger.warning("Could not award sprint-planning XP: %s", error)
    return plan


@router.post("/{project_id}/decompose", response_model=list[TaskOut], status_code=status.HTTP_201_CREATED)
async def decompose_project(
    project_id: str,
    current_user=Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
    task_service: TaskService = Depends(get_task_service),
    ai_service: AIService = Depends(get_ai_service),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    project = await project_service.get_project(project_id, str(current_user.id))

    title = project["title"]
    goal = project.get("goal") or project.get("description") or title

    ai_tasks = await ai_service.decompose_project(title, goal)
    created_tasks = await task_service.bulk_create_tasks(project_id, ai_tasks)
    try:
        await gamification_service.award_ai_xp(str(current_user.id), "ai_task_decomposition", "Used AI Task Decomposition", 15)
    except Exception as error:
        logger.warning("Could not award decomposition XP: %s", error)
    return created_tasks
