from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from domain.entities.project import Project


class ProjectRepository(ABC):
    @abstractmethod
    async def create(self, project: Project) -> Project:
        pass

    @abstractmethod
    async def get_by_id(self, project_id: UUID) -> Optional[Project]:
        pass

    @abstractmethod
    async def get_by_user_id(self, user_id: UUID) -> list[Project]:
        pass

    @abstractmethod
    async def update(self, project: Project) -> Project:
        pass

    @abstractmethod
    async def delete(self, project_id: UUID) -> bool:
        pass
