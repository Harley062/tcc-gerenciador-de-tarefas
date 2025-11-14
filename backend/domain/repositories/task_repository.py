from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from domain.entities.task import Task
from domain.value_objects.task_status import TaskStatus


class TaskRepository(ABC):
    @abstractmethod
    async def create(self, task: Task) -> Task:
        pass

    @abstractmethod
    async def get_by_id(self, task_id: UUID) -> Optional[Task]:
        pass

    @abstractmethod
    async def get_by_user_id(
        self,
        user_id: UUID,
        status: Optional[TaskStatus] = None,
        project_id: Optional[UUID] = None,
    ) -> list[Task]:
        pass

    @abstractmethod
    async def update(self, task: Task) -> Task:
        pass

    @abstractmethod
    async def delete(self, task_id: UUID) -> bool:
        pass

    @abstractmethod
    async def get_subtasks(self, parent_task_id: UUID) -> list[Task]:
        pass
