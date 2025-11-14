from typing import Any, Optional
from uuid import UUID

from application.services.gpt_service import GPTService
from domain.entities.task import Task
from domain.repositories.task_repository import TaskRepository
from domain.value_objects.priority import Priority
from domain.value_objects.task_status import TaskStatus


class CreateTaskUseCase:
    def __init__(self, task_repository: TaskRepository, gpt_service: GPTService):
        self.task_repository = task_repository
        self.gpt_service = gpt_service
        self.event_callback = None

    def set_event_callback(self, callback):
        """Set callback function to emit events after task creation"""
        self.event_callback = callback

    async def execute_from_natural_language(
        self, user_id: UUID, natural_language_input: str, project_id: Optional[UUID] = None
    ) -> tuple[Task, dict[str, Any]]:
        parsed_task, gpt_response = await self.gpt_service.parse_task(natural_language_input)

        task = Task(
            user_id=user_id,
            project_id=project_id,
            title=parsed_task.title,
            description=parsed_task.description,
            priority=Priority(parsed_task.priority),
            due_date=parsed_task.due_date,
            estimated_duration=parsed_task.estimated_duration,
            tags=parsed_task.tags,
            natural_language_input=natural_language_input,
            gpt_response=gpt_response,
        )

        created_task = await self.task_repository.create(task)
        
        if self.event_callback:
            await self.event_callback("task_created", created_task.to_dict(), user_id)
        
        return created_task, gpt_response

    async def execute_structured(
        self,
        user_id: UUID,
        title: str,
        description: Optional[str] = None,
        status: TaskStatus = TaskStatus.TODO,
        priority: Priority = Priority.MEDIUM,
        due_date: Optional[Any] = None,
        estimated_duration: Optional[int] = None,
        tags: Optional[list[str]] = None,
        project_id: Optional[UUID] = None,
        parent_task_id: Optional[UUID] = None,
    ) -> Task:
        task = Task(
            user_id=user_id,
            project_id=project_id,
            parent_task_id=parent_task_id,
            title=title,
            description=description,
            status=status,
            priority=priority,
            due_date=due_date,
            estimated_duration=estimated_duration,
            tags=tags,
        )

        created_task = await self.task_repository.create(task)
        
        if self.event_callback:
            await self.event_callback("task_created", created_task.to_dict(), user_id)
        
        return created_task
