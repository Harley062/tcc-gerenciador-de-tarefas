from typing import Optional
from uuid import UUID

from domain.entities.task import Task
from domain.repositories.task_repository import TaskRepository
from domain.value_objects.priority import Priority
from domain.value_objects.task_status import TaskStatus


class GetTasksUseCase:
    def __init__(self, task_repository: TaskRepository):
        self.task_repository = task_repository

    async def execute(
        self,
        user_id: UUID,
        status: Optional[TaskStatus] = None,
        project_id: Optional[UUID] = None,
    ) -> list[Task]:
        return await self.task_repository.get_by_user_id(user_id, status, project_id)


class GetTaskByIdUseCase:
    def __init__(self, task_repository: TaskRepository):
        self.task_repository = task_repository

    async def execute(self, task_id: UUID, user_id: UUID) -> Optional[Task]:
        task = await self.task_repository.get_by_id(task_id)
        if task and task.user_id == user_id:
            return task
        return None


class UpdateTaskUseCase:
    def __init__(self, task_repository: TaskRepository):
        self.task_repository = task_repository

    async def execute(
        self,
        task_id: UUID,
        user_id: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        status: Optional[TaskStatus] = None,
        priority: Optional[Priority] = None,
        due_date: Optional[any] = None,
        estimated_duration: Optional[int] = None,
        actual_duration: Optional[int] = None,
        tags: Optional[list[str]] = None,
        project_id: Optional[UUID] = None,
    ) -> Optional[Task]:
        task = await self.task_repository.get_by_id(task_id)
        if not task or task.user_id != user_id:
            return None

        if title is not None:
            task.title = title
        if description is not None:
            task.description = description
        if status is not None:
            task.status = status
            if status == TaskStatus.DONE:
                task.mark_completed()
        if priority is not None:
            task.priority = priority
        if due_date is not None:
            task.due_date = due_date
        if estimated_duration is not None:
            task.estimated_duration = estimated_duration
        if actual_duration is not None:
            task.actual_duration = actual_duration
        if tags is not None:
            task.tags = tags
        if project_id is not None:
            task.project_id = project_id

        return await self.task_repository.update(task)


class DeleteTaskUseCase:
    def __init__(self, task_repository: TaskRepository):
        self.task_repository = task_repository

    async def execute(self, task_id: UUID, user_id: UUID) -> bool:
        task = await self.task_repository.get_by_id(task_id)
        if not task or task.user_id != user_id:
            return False
        return await self.task_repository.delete(task_id)


class GetSubtasksUseCase:
    def __init__(self, task_repository: TaskRepository):
        self.task_repository = task_repository

    async def execute(self, parent_task_id: UUID, user_id: UUID) -> list[Task]:
        parent_task = await self.task_repository.get_by_id(parent_task_id)
        if not parent_task or parent_task.user_id != user_id:
            return []
        return await self.task_repository.get_subtasks(parent_task_id)
