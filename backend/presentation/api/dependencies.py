from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from application.services.auth_service import AuthService
from application.services.gpt_service import GPTService
from application.use_cases.create_task import CreateTaskUseCase
from application.use_cases.manage_tasks import (
    DeleteTaskUseCase,
    GetSubtasksUseCase,
    GetTaskByIdUseCase,
    GetTasksUseCase,
    UpdateTaskUseCase,
)
from domain.entities.user import User
from infrastructure.cache.redis_cache import RedisCache
from infrastructure.database.connection import Database
from infrastructure.database.postgresql_repository import (
    PostgreSQLTaskRepository,
    PostgreSQLUserRepository,
)
from infrastructure.gpt.openai_adapter import OpenAIAdapter
from presentation.config import get_settings

settings = get_settings()

database = Database(settings.database_url)
redis_cache = RedisCache(settings.redis_url)
openai_adapter = OpenAIAdapter(settings.openai_api_key, settings.openai_model)

security = HTTPBearer()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in database.get_session():
        yield session


async def get_auth_service(session: AsyncSession = Depends(get_db_session)) -> AuthService:
    user_repository = PostgreSQLUserRepository(session)
    return AuthService(
        user_repository=user_repository,
        secret_key=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
        access_token_expire_minutes=settings.access_token_expire_minutes,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    token = credentials.credentials
    user = await auth_service.get_current_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_gpt_service() -> GPTService:
    return GPTService(openai_adapter, redis_cache)


async def get_create_task_use_case(
    session: AsyncSession = Depends(get_db_session),
    gpt_service: GPTService = Depends(get_gpt_service),
) -> CreateTaskUseCase:
    task_repository = PostgreSQLTaskRepository(session)
    return CreateTaskUseCase(task_repository, gpt_service)


async def get_get_tasks_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> GetTasksUseCase:
    task_repository = PostgreSQLTaskRepository(session)
    return GetTasksUseCase(task_repository)


async def get_get_task_by_id_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> GetTaskByIdUseCase:
    task_repository = PostgreSQLTaskRepository(session)
    return GetTaskByIdUseCase(task_repository)


async def get_update_task_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> UpdateTaskUseCase:
    task_repository = PostgreSQLTaskRepository(session)
    return UpdateTaskUseCase(task_repository)


async def get_delete_task_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> DeleteTaskUseCase:
    task_repository = PostgreSQLTaskRepository(session)
    return DeleteTaskUseCase(task_repository)


async def get_get_subtasks_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> GetSubtasksUseCase:
    task_repository = PostgreSQLTaskRepository(session)
    return GetSubtasksUseCase(task_repository)
