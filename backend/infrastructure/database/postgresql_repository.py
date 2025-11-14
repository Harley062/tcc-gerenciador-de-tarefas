from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.project import Project
from domain.entities.task import Task
from domain.entities.user import User
from domain.repositories.project_repository import ProjectRepository
from domain.repositories.task_repository import TaskRepository
from domain.repositories.user_repository import UserRepository
from domain.value_objects.priority import Priority
from domain.value_objects.task_status import TaskStatus
from infrastructure.database.models import ProjectModel, TaskModel, UserModel


class PostgreSQLUserRepository(UserRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user: User) -> User:
        user_model = UserModel(
            id=user.id,
            email=user.email,
            hashed_password=user.hashed_password,
            full_name=user.full_name,
            is_active=user.is_active,
        )
        self.session.add(user_model)
        await self.session.flush()
        return self._to_entity(user_model)

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        result = await self.session.execute(select(UserModel).where(UserModel.id == user_id))
        user_model = result.scalar_one_or_none()
        return self._to_entity(user_model) if user_model else None

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(select(UserModel).where(UserModel.email == email))
        user_model = result.scalar_one_or_none()
        return self._to_entity(user_model) if user_model else None

    async def update(self, user: User) -> User:
        result = await self.session.execute(select(UserModel).where(UserModel.id == user.id))
        user_model = result.scalar_one_or_none()
        if user_model:
            user_model.email = user.email
            user_model.hashed_password = user.hashed_password
            user_model.full_name = user.full_name
            user_model.is_active = user.is_active
            user_model.updated_at = datetime.utcnow()
            await self.session.flush()
            return self._to_entity(user_model)
        raise ValueError(f"User with id {user.id} not found")

    def _to_entity(self, model: UserModel) -> User:
        return User(
            id=model.id,
            email=model.email,
            hashed_password=model.hashed_password,
            full_name=model.full_name,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )


class PostgreSQLProjectRepository(ProjectRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, project: Project) -> Project:
        project_model = ProjectModel(
            id=project.id,
            user_id=project.user_id,
            name=project.name,
            description=project.description,
            color=project.color,
            icon=project.icon,
        )
        self.session.add(project_model)
        await self.session.flush()
        return self._to_entity(project_model)

    async def get_by_id(self, project_id: UUID) -> Optional[Project]:
        result = await self.session.execute(
            select(ProjectModel).where(ProjectModel.id == project_id)
        )
        project_model = result.scalar_one_or_none()
        return self._to_entity(project_model) if project_model else None

    async def get_by_user_id(self, user_id: UUID) -> list[Project]:
        result = await self.session.execute(
            select(ProjectModel).where(ProjectModel.user_id == user_id)
        )
        project_models = result.scalars().all()
        return [self._to_entity(model) for model in project_models]

    async def update(self, project: Project) -> Project:
        result = await self.session.execute(
            select(ProjectModel).where(ProjectModel.id == project.id)
        )
        project_model = result.scalar_one_or_none()
        if project_model:
            project_model.name = project.name
            project_model.description = project.description
            project_model.color = project.color
            project_model.icon = project.icon
            project_model.updated_at = datetime.utcnow()
            await self.session.flush()
            return self._to_entity(project_model)
        raise ValueError(f"Project with id {project.id} not found")

    async def delete(self, project_id: UUID) -> bool:
        result = await self.session.execute(
            select(ProjectModel).where(ProjectModel.id == project_id)
        )
        project_model = result.scalar_one_or_none()
        if project_model:
            await self.session.delete(project_model)
            await self.session.flush()
            return True
        return False

    def _to_entity(self, model: ProjectModel) -> Project:
        return Project(
            id=model.id,
            user_id=model.user_id,
            name=model.name,
            description=model.description,
            color=model.color,
            icon=model.icon,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )


class PostgreSQLTaskRepository(TaskRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, task: Task) -> Task:
        task_model = TaskModel(
            id=task.id,
            user_id=task.user_id,
            project_id=task.project_id,
            parent_task_id=task.parent_task_id,
            title=task.title,
            description=task.description,
            status=task.status.value,
            priority=task.priority.value,
            due_date=task.due_date,
            estimated_duration=task.estimated_duration,
            actual_duration=task.actual_duration,
            completed_at=task.completed_at,
            tags=task.tags,
            task_metadata=task.metadata,
            natural_language_input=task.natural_language_input,
            gpt_response=task.gpt_response,
        )
        self.session.add(task_model)
        await self.session.flush()
        return self._to_entity(task_model)

    async def get_by_id(self, task_id: UUID) -> Optional[Task]:
        result = await self.session.execute(select(TaskModel).where(TaskModel.id == task_id))
        task_model = result.scalar_one_or_none()
        return self._to_entity(task_model) if task_model else None

    async def get_by_user_id(
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
        query = select(TaskModel).where(TaskModel.user_id == user_id)
        
        if status:
            query = query.where(TaskModel.status == status.value)
        if project_id:
            query = query.where(TaskModel.project_id == project_id)
        if search_query:
            search_pattern = f"%{search_query}%"
            query = query.where(
                or_(
                    TaskModel.title.ilike(search_pattern),
                    TaskModel.description.ilike(search_pattern),
                )
            )
        
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0
        
        sort_column = getattr(TaskModel, sort_by, TaskModel.created_at)
        if sort_order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
        
        query = query.limit(limit).offset(offset)
        
        result = await self.session.execute(query)
        task_models = result.scalars().all()
        return [self._to_entity(model) for model in task_models], total

    async def update(self, task: Task) -> Task:
        result = await self.session.execute(select(TaskModel).where(TaskModel.id == task.id))
        task_model = result.scalar_one_or_none()
        if task_model:
            task_model.title = task.title
            task_model.description = task.description
            task_model.status = task.status.value
            task_model.priority = task.priority.value
            task_model.due_date = task.due_date
            task_model.estimated_duration = task.estimated_duration
            task_model.actual_duration = task.actual_duration
            task_model.completed_at = task.completed_at
            task_model.tags = task.tags
            task_model.task_metadata = task.metadata
            task_model.project_id = task.project_id
            task_model.updated_at = datetime.utcnow()
            await self.session.flush()
            return self._to_entity(task_model)
        raise ValueError(f"Task with id {task.id} not found")

    async def delete(self, task_id: UUID) -> bool:
        result = await self.session.execute(select(TaskModel).where(TaskModel.id == task_id))
        task_model = result.scalar_one_or_none()
        if task_model:
            await self.session.delete(task_model)
            await self.session.flush()
            return True
        return False

    async def get_subtasks(self, parent_task_id: UUID) -> list[Task]:
        result = await self.session.execute(
            select(TaskModel).where(TaskModel.parent_task_id == parent_task_id)
        )
        task_models = result.scalars().all()
        return [self._to_entity(model) for model in task_models]

    def _to_entity(self, model: TaskModel) -> Task:
        return Task(
            id=model.id,
            user_id=model.user_id,
            project_id=model.project_id,
            parent_task_id=model.parent_task_id,
            title=model.title,
            description=model.description,
            status=TaskStatus(model.status),
            priority=Priority(model.priority),
            due_date=model.due_date,
            estimated_duration=model.estimated_duration,
            actual_duration=model.actual_duration,
            completed_at=model.completed_at,
            tags=model.tags or [],
            metadata=model.task_metadata or {},
            natural_language_input=model.natural_language_input,
            gpt_response=model.gpt_response,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
