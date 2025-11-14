from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from domain.entities.user import User
from infrastructure.database.user_settings_repository import UserSettingsRepository
from presentation.api.dependencies import get_current_user, get_db_session
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/settings", tags=["settings"])


class UserSettingsResponse(BaseModel):
    id: str
    user_id: str
    llm_provider: str
    openai_api_key: Optional[str]
    llama_endpoint: str
    default_task_duration: int
    enable_auto_subtasks: bool
    enable_auto_priority: bool
    enable_auto_tags: bool
    created_at: Optional[str]
    updated_at: Optional[str]


class UpdateSettingsRequest(BaseModel):
    llm_provider: Optional[str] = None
    openai_api_key: Optional[str] = None
    llama_endpoint: Optional[str] = None
    default_task_duration: Optional[int] = None
    enable_auto_subtasks: Optional[bool] = None
    enable_auto_priority: Optional[bool] = None
    enable_auto_tags: Optional[bool] = None


@router.get("", response_model=UserSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Get current user's settings"""
    repo = UserSettingsRepository(session)
    settings = await repo.get_or_create(current_user.id)
    return UserSettingsResponse(**settings.to_dict())


@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    request: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Update current user's settings"""
    repo = UserSettingsRepository(session)
    settings = await repo.get_or_create(current_user.id)
    
    # Update only provided fields
    if request.llm_provider is not None:
        if request.llm_provider not in ["gpt4", "llama", "regex"]:
            raise HTTPException(status_code=400, detail="Invalid LLM provider")
        settings.llm_provider = request.llm_provider
    
    if request.openai_api_key is not None:
        settings.openai_api_key = request.openai_api_key if request.openai_api_key else None
    
    if request.llama_endpoint is not None:
        settings.llama_endpoint = request.llama_endpoint
    
    if request.default_task_duration is not None:
        settings.default_task_duration = request.default_task_duration
    
    if request.enable_auto_subtasks is not None:
        settings.enable_auto_subtasks = request.enable_auto_subtasks
    
    if request.enable_auto_priority is not None:
        settings.enable_auto_priority = request.enable_auto_priority
    
    if request.enable_auto_tags is not None:
        settings.enable_auto_tags = request.enable_auto_tags
    
    updated_settings = await repo.update(settings)
    return UserSettingsResponse(**updated_settings.to_dict())
