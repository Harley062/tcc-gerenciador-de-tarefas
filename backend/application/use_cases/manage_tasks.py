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
        limit: int = 20,
        offset: int = 0,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        search_query: Optional[str] = None,
    ) -> tuple[list[Task], int]:
        return await self.task_repository.get_by_user_id(
            user_id=user_id,
            status=status,
            project_id=project_id,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order,
            search_query=search_query,
        )


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
        self.event_callback = None

    def set_event_callback(self, callback):
        """Set callback function to emit events after task update"""
        self.event_callback = callback

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

        updated_task = await self.task_repository.update(task)
        
        if updated_task and self.event_callback:
            await self.event_callback("task_updated", updated_task.to_dict(), user_id)
        
        return updated_task


class DeleteTaskUseCase:
    def __init__(self, task_repository: TaskRepository):
        self.task_repository = task_repository
        self.event_callback = None

    def set_event_callback(self, callback):
        """Set callback function to emit events after task deletion"""
        self.event_callback = callback

    async def execute(self, task_id: UUID, user_id: UUID) -> bool:
        task = await self.task_repository.get_by_id(task_id)
        if not task or task.user_id != user_id:
            return False
        
        success = await self.task_repository.delete(task_id)
        
        if success and self.event_callback:
            await self.event_callback("task_deleted", {"id": str(task_id)}, user_id)
        
        return success


class GetSubtasksUseCase:
    def __init__(self, task_repository: TaskRepository):
        self.task_repository = task_repository

    async def execute(self, parent_task_id: UUID, user_id: UUID) -> list[Task]:
        parent_task = await self.task_repository.get_by_id(parent_task_id)
        if not parent_task or parent_task.user_id != user_id:
            return []
        return await self.task_repository.get_subtasks(parent_task_id)
