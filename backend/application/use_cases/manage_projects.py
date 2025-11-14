from typing import Optional
from uuid import UUID

from domain.entities.project import Project
from domain.repositories.project_repository import ProjectRepository


class CreateProjectUseCase:
    def __init__(self, project_repository: ProjectRepository):
        self.project_repository = project_repository

    async def execute(
        self,
        user_id: UUID,
        name: str,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None,
    ) -> Project:
        project = Project(
            user_id=user_id,
            name=name,
            description=description,
            color=color,
            icon=icon,
        )
        return await self.project_repository.create(project)


class GetProjectsUseCase:
    def __init__(self, project_repository: ProjectRepository):
        self.project_repository = project_repository

    async def execute(self, user_id: UUID) -> list[Project]:
        return await self.project_repository.get_by_user_id(user_id)


class GetProjectByIdUseCase:
    def __init__(self, project_repository: ProjectRepository):
        self.project_repository = project_repository

    async def execute(self, project_id: UUID, user_id: UUID) -> Optional[Project]:
        project = await self.project_repository.get_by_id(project_id)
        if project and project.user_id == user_id:
            return project
        return None


class UpdateProjectUseCase:
    def __init__(self, project_repository: ProjectRepository):
        self.project_repository = project_repository

    async def execute(
        self,
        project_id: UUID,
        user_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None,
    ) -> Optional[Project]:
        project = await self.project_repository.get_by_id(project_id)
        if not project or project.user_id != user_id:
            return None

        if name is not None:
            project.name = name
        if description is not None:
            project.description = description
        if color is not None:
            project.color = color
        if icon is not None:
            project.icon = icon

        return await self.project_repository.update(project)


class DeleteProjectUseCase:
    def __init__(self, project_repository: ProjectRepository):
        self.project_repository = project_repository

    async def execute(self, project_id: UUID, user_id: UUID) -> bool:
        project = await self.project_repository.get_by_id(project_id)
        if not project or project.user_id != user_id:
            return False
        return await self.project_repository.delete(project_id)
