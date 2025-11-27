from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

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
        self, user_id: UUID, natural_language_input: str, project_id: Optional[UUID] = None, max_recurrences: int = 8
    ) -> tuple[Task, dict[str, Any]]:
        parsed_task, gpt_response = await self.gpt_service.parse_task(natural_language_input)

        if parsed_task.recurrence:
            return await self._create_recurring_tasks(
                user_id=user_id,
                project_id=project_id,
                parsed_task=parsed_task,
                natural_language_input=natural_language_input,
                gpt_response=gpt_response,
                max_recurrences=max_recurrences,
            )
        
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
    
    async def _create_recurring_tasks(
        self,
        user_id: UUID,
        project_id: Optional[UUID],
        parsed_task: Any,
        natural_language_input: str,
        gpt_response: dict,
        max_recurrences: int,
    ) -> tuple[Task, dict[str, Any]]:
        """Create multiple tasks for recurring pattern"""
        recurrence = parsed_task.recurrence
        frequency = recurrence.get("frequency", "weekly")
        interval = recurrence.get("interval", 1)
        
        series_id = str(uuid4())
        
        if parsed_task.due_date:
            start_date = parsed_task.due_date
        else:
            start_date = datetime.now(timezone.utc).replace(hour=9, minute=0, second=0, microsecond=0)
            if frequency == "weekly":
                days_ahead = (0 - start_date.weekday()) % 7
                if days_ahead == 0:
                    days_ahead = 7
                start_date = start_date + timedelta(days=days_ahead)
            elif frequency == "daily":
                start_date = start_date + timedelta(days=1)
            elif frequency == "monthly":
                if start_date.month == 12:
                    start_date = start_date.replace(year=start_date.year + 1, month=1)
                else:
                    start_date = start_date.replace(month=start_date.month + 1)
        
        created_tasks = []
        for i in range(max_recurrences):
            if frequency == "daily":
                occurrence_date = start_date + timedelta(days=i * interval)
            elif frequency == "weekly":
                occurrence_date = start_date + timedelta(weeks=i * interval)
            elif frequency == "monthly":
                months_to_add = i * interval
                new_month = start_date.month + months_to_add
                new_year = start_date.year + (new_month - 1) // 12
                new_month = ((new_month - 1) % 12) + 1
                try:
                    occurrence_date = start_date.replace(year=new_year, month=new_month)
                except ValueError:
                    occurrence_date = start_date.replace(year=new_year, month=new_month, day=28)
            else:
                occurrence_date = start_date + timedelta(days=i * 7)
            
            task = Task(
                user_id=user_id,
                project_id=project_id,
                title=f"{parsed_task.title} ({i+1}/{max_recurrences})",
                description=parsed_task.description,
                priority=Priority(parsed_task.priority),
                due_date=occurrence_date,
                estimated_duration=parsed_task.estimated_duration,
                tags=parsed_task.tags,
                metadata={
                    "recurrence": recurrence,
                    "series_id": series_id,
                    "occurrence_number": i + 1,
                    "total_occurrences": max_recurrences,
                },
                natural_language_input=natural_language_input if i == 0 else None,
                gpt_response=gpt_response if i == 0 else None,
            )
            
            created_task = await self.task_repository.create(task)
            created_tasks.append(created_task)
            
            if self.event_callback:
                await self.event_callback("task_created", created_task.to_dict(), user_id)
        
        return created_tasks[0], {**gpt_response, "recurring_tasks_created": len(created_tasks)}

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
