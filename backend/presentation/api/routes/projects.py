from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from application.use_cases.manage_projects import (
    CreateProjectUseCase,
    DeleteProjectUseCase,
    GetProjectByIdUseCase,
    GetProjectsUseCase,
    UpdateProjectUseCase,
)
from domain.entities.user import User
from presentation.api.dependencies import (
    get_create_project_use_case,
    get_current_user,
    get_delete_project_use_case,
    get_get_project_by_id_use_case,
    get_get_projects_use_case,
    get_update_project_use_case,
)
from presentation.api.schemas import (
    CreateProjectRequest,
    ProjectListResponse,
    ProjectResponse,
    UpdateProjectRequest,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    request: CreateProjectRequest,
    current_user: User = Depends(get_current_user),
    create_project_use_case: CreateProjectUseCase = Depends(get_create_project_use_case),
) -> ProjectResponse:
    project = await create_project_use_case.execute(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        color=request.color,
        icon=request.icon,
    )
    project_dict = project.to_dict()
    return ProjectResponse(**project_dict)


@router.get("", response_model=ProjectListResponse)
async def get_projects(
    current_user: User = Depends(get_current_user),
    get_projects_use_case: GetProjectsUseCase = Depends(get_get_projects_use_case),
) -> ProjectListResponse:
    projects = await get_projects_use_case.execute(user_id=current_user.id)
    project_responses = [ProjectResponse(**project.to_dict()) for project in projects]
    return ProjectListResponse(projects=project_responses, total=len(project_responses))


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    get_project_by_id_use_case: GetProjectByIdUseCase = Depends(get_get_project_by_id_use_case),
) -> ProjectResponse:
    project = await get_project_by_id_use_case.execute(project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    project_dict = project.to_dict()
    return ProjectResponse(**project_dict)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    request: UpdateProjectRequest,
    current_user: User = Depends(get_current_user),
    update_project_use_case: UpdateProjectUseCase = Depends(get_update_project_use_case),
) -> ProjectResponse:
    project = await update_project_use_case.execute(
        project_id=project_id,
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        color=request.color,
        icon=request.icon,
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    project_dict = project.to_dict()
    return ProjectResponse(**project_dict)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    delete_project_use_case: DeleteProjectUseCase = Depends(get_delete_project_use_case),
) -> None:
    success = await delete_project_use_case.execute(project_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
