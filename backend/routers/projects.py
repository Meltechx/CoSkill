from asyncio import gather

from fastapi import APIRouter, Depends, status

from dependencies import get_ai_service, get_current_user, get_project_service, get_task_service
from models.project import ProjectCreate, ProjectOut, ProjectRiskOut
from models.task import TaskOut
from services.ai_service import AIService, calculate_project_risk
from services.project_service import ProjectService
from services.task_service import TaskService

router = APIRouter()


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


@router.get("/{project_id}/risk", response_model=ProjectRiskOut)
async def analyze_project_risk(
    project_id: str,
    current_user=Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
    task_service: TaskService = Depends(get_task_service),
    ai_service: AIService = Depends(get_ai_service),
):
    project, tasks = await gather(
        project_service.get_project(project_id, str(current_user.id)),
        task_service.list_tasks(project_id, str(current_user.id)),
    )
    calculated_risk = calculate_project_risk(project, tasks)
    return await ai_service.analyze_project_risk(calculated_risk)


@router.post("/{project_id}/decompose", response_model=list[TaskOut], status_code=status.HTTP_201_CREATED)
async def decompose_project(
    project_id: str,
    current_user=Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
    task_service: TaskService = Depends(get_task_service),
    ai_service: AIService = Depends(get_ai_service),
):
    project = await project_service.get_project(project_id, str(current_user.id))

    title = project["title"]
    goal = project.get("goal") or project.get("description") or title

    ai_tasks = await ai_service.decompose_project(title, goal)
    return await task_service.bulk_create_tasks(project_id, ai_tasks)
