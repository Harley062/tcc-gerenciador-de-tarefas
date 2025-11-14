from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from application.use_cases.create_task import CreateTaskUseCase
from application.use_cases.manage_tasks import (
    DeleteTaskUseCase,
    GetSubtasksUseCase,
    GetTaskByIdUseCase,
    GetTasksUseCase,
    UpdateTaskUseCase,
)
from domain.entities.user import User
from domain.value_objects.priority import Priority
from domain.value_objects.task_status import TaskStatus
from presentation.api.dependencies import (
    get_create_task_use_case,
    get_current_user,
    get_delete_task_use_case,
    get_get_subtasks_use_case,
    get_get_task_by_id_use_case,
    get_get_tasks_use_case,
    get_update_task_use_case,
)
from presentation.api.schemas import (
    CreateTaskNaturalLanguageRequest,
    CreateTaskStructuredRequest,
    TaskListResponse,
    TaskResponse,
    UpdateTaskRequest,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    request: CreateTaskNaturalLanguageRequest | CreateTaskStructuredRequest,
    current_user: User = Depends(get_current_user),
    create_task_use_case: CreateTaskUseCase = Depends(get_create_task_use_case),
) -> TaskResponse:
    if isinstance(request, CreateTaskNaturalLanguageRequest):
        task, gpt_response = await create_task_use_case.execute_from_natural_language(
            user_id=current_user.id,
            natural_language_input=request.natural_language_input,
            project_id=request.project_id,
        )
    else:
        task = await create_task_use_case.execute_structured(
            user_id=current_user.id,
            title=request.title,
            description=request.description,
            status=TaskStatus(request.status) if request.status else TaskStatus.TODO,
            priority=Priority(request.priority) if request.priority else Priority.MEDIUM,
            due_date=request.due_date,
            estimated_duration=request.estimated_duration,
            tags=request.tags,
            project_id=request.project_id,
            parent_task_id=request.parent_task_id,
        )

    task_dict = task.to_dict()
    return TaskResponse(**task_dict)


@router.get("", response_model=TaskListResponse)
async def get_tasks(
    status: Optional[str] = None,
    project_id: Optional[UUID] = None,
    limit: int = 20,
    offset: int = 0,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    q: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    get_tasks_use_case: GetTasksUseCase = Depends(get_get_tasks_use_case),
) -> TaskListResponse:
    task_status = TaskStatus(status) if status else None
    tasks, total = await get_tasks_use_case.execute(
        user_id=current_user.id,
        status=task_status,
        project_id=project_id,
        limit=min(limit, 100),
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order,
        search_query=q,
    )

    task_responses = [TaskResponse(**task.to_dict()) for task in tasks]
    return TaskListResponse(tasks=task_responses, total=total)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    get_task_by_id_use_case: GetTaskByIdUseCase = Depends(get_get_task_by_id_use_case),
) -> TaskResponse:
    task = await get_task_by_id_use_case.execute(task_id, current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    task_dict = task.to_dict()
    return TaskResponse(**task_dict)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    request: UpdateTaskRequest,
    current_user: User = Depends(get_current_user),
    update_task_use_case: UpdateTaskUseCase = Depends(get_update_task_use_case),
) -> TaskResponse:
    task = await update_task_use_case.execute(
        task_id=task_id,
        user_id=current_user.id,
        title=request.title,
        description=request.description,
        status=TaskStatus(request.status) if request.status else None,
        priority=Priority(request.priority) if request.priority else None,
        due_date=request.due_date,
        estimated_duration=request.estimated_duration,
        actual_duration=request.actual_duration,
        tags=request.tags,
        project_id=request.project_id,
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    task_dict = task.to_dict()
    return TaskResponse(**task_dict)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    delete_task_use_case: DeleteTaskUseCase = Depends(get_delete_task_use_case),
) -> None:
    success = await delete_task_use_case.execute(task_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )


@router.post("/{task_id}/subtasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_subtask(
    task_id: UUID,
    request: CreateTaskStructuredRequest,
    current_user: User = Depends(get_current_user),
    create_task_use_case: CreateTaskUseCase = Depends(get_create_task_use_case),
    get_task_by_id_use_case: GetTaskByIdUseCase = Depends(get_get_task_by_id_use_case),
) -> TaskResponse:
    parent_task = await get_task_by_id_use_case.execute(task_id, current_user.id)
    if not parent_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent task not found",
        )

    task = await create_task_use_case.execute_structured(
        user_id=current_user.id,
        title=request.title,
        description=request.description,
        status=TaskStatus(request.status) if request.status else TaskStatus.TODO,
        priority=Priority(request.priority) if request.priority else Priority.MEDIUM,
        due_date=request.due_date,
        estimated_duration=request.estimated_duration,
        tags=request.tags,
        project_id=request.project_id,
        parent_task_id=task_id,
    )

    task_dict = task.to_dict()
    return TaskResponse(**task_dict)


@router.get("/{task_id}/subtasks", response_model=TaskListResponse)
async def get_subtasks(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    get_subtasks_use_case: GetSubtasksUseCase = Depends(get_get_subtasks_use_case),
) -> TaskListResponse:
    subtasks = await get_subtasks_use_case.execute(task_id, current_user.id)
    task_responses = [TaskResponse(**task.to_dict()) for task in subtasks]
    return TaskListResponse(tasks=task_responses, total=len(task_responses))
