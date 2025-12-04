from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.user_settings import UserSettings
from infrastructure.database.models import UserSettingsModel


class UserSettingsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user_id(self, user_id: UUID) -> Optional[UserSettings]:
        """Get user settings by user ID"""
        result = await self.session.execute(
            select(UserSettingsModel).where(UserSettingsModel.user_id == user_id)
        )
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        return UserSettings(
            id=model.id,
            user_id=model.user_id,
            llm_provider=model.llm_provider,
            openai_api_key=model.openai_api_key,
            llama_endpoint=model.llama_endpoint,
            default_task_duration=model.default_task_duration,
            enable_auto_subtasks=model.enable_auto_subtasks,
            enable_auto_priority=model.enable_auto_priority,
            enable_auto_tags=model.enable_auto_tags,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def create(self, settings: UserSettings) -> UserSettings:
        """Create new user settings"""
        model = UserSettingsModel(
            user_id=settings.user_id,
            llm_provider=settings.llm_provider,
            openai_api_key=settings.openai_api_key,
            llama_endpoint=settings.llama_endpoint,
            default_task_duration=settings.default_task_duration,
            enable_auto_subtasks=settings.enable_auto_subtasks,
            enable_auto_priority=settings.enable_auto_priority,
            enable_auto_tags=settings.enable_auto_tags,
        )
        
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        
        settings.id = model.id
        settings.created_at = model.created_at
        settings.updated_at = model.updated_at
        
        return settings

    async def update(self, settings: UserSettings) -> UserSettings:
        """Update existing user settings"""
        await self.session.execute(
            update(UserSettingsModel)
            .where(UserSettingsModel.user_id == settings.user_id)
            .values(
                llm_provider=settings.llm_provider,
                openai_api_key=settings.openai_api_key,
                llama_endpoint=settings.llama_endpoint,
                default_task_duration=settings.default_task_duration,
                enable_auto_subtasks=settings.enable_auto_subtasks,
                enable_auto_priority=settings.enable_auto_priority,
                enable_auto_tags=settings.enable_auto_tags,
            )
        )
        await self.session.commit()
        
        result = await self.session.execute(
            select(UserSettingsModel).where(UserSettingsModel.user_id == settings.user_id)
        )
        model = result.scalar_one()
        settings.updated_at = model.updated_at
        
        return settings

    async def get_or_create(self, user_id: UUID) -> UserSettings:
        """Get existing settings or create default ones"""
        settings = await self.get_by_user_id(user_id)
        
        if not settings:
            settings = UserSettings(user_id=user_id)
            settings = await self.create(settings)
        
        return settings
