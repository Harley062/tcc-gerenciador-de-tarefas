"""
AI Features API Routes
"""
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from application.services.ai_insights_service import AIInsightsService
from application.services.chat_assistant_service import ChatAssistantService
from domain.entities.user import User
from infrastructure.database.postgresql_repository import PostgreSQLTaskRepository
from presentation.api.dependencies import get_current_user, get_db_session
from pydantic import BaseModel
import os
from presentation.config import get_settings

logger = logging.getLogger("taskmaster")

router = APIRouter(prefix="/ai", tags=["ai"])


class SubtaskSuggestionRequest(BaseModel):
    task_title: str
    task_description: Optional[str] = None


class SubtaskSuggestion(BaseModel):
    title: str
    description: str
    estimated_duration: int


class SubtaskSuggestionsResponse(BaseModel):
    subtasks: List[SubtaskSuggestion]
    provider: str


class SentimentAnalysisRequest(BaseModel):
    text: str


class SentimentAnalysisResponse(BaseModel):
    priority: str
    urgency_score: float
    sentiment: str
    confidence: float


class DurationEstimateRequest(BaseModel):
    task_title: str
    task_description: Optional[str] = None


class DurationEstimateResponse(BaseModel):
    estimated_duration: int
    confidence: float


class SchedulingSuggestionRequest(BaseModel):
    task_id: str


class SchedulingSuggestionResponse(BaseModel):
    suggestion: str
    suggested_time: str
    reason: str
    confidence: float


class DependencyDetectionRequest(BaseModel):
    task_id: str


class DependencyResponse(BaseModel):
    task_id: str
    task_title: str
    relationship: str
    confidence: float
    reason: str


class DependenciesResponse(BaseModel):
    dependencies: List[DependencyResponse]


class SummaryRequest(BaseModel):
    period: str = "daily"  # daily, weekly, monthly


class SummaryResponse(BaseModel):
    period: str
    summary: dict
    insights: List[str]
    top_completed: List[dict]
    high_priority_pending: List[dict]
    recommendations: List[str]


class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    message: str
    action: Optional[str]
    data: Optional[dict]


async def get_ai_insights_service(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AIInsightsService:
    """Get AI insights service with user's settings"""
    from infrastructure.database.user_settings_repository import UserSettingsRepository
    from infrastructure.gpt.openai_adapter import OpenAIAdapter
    from infrastructure.llm.llama_adapter import LlamaAdapter
    import os
    from presentation.config import get_settings
    
    settings_repo = UserSettingsRepository(session)
    settings = await settings_repo.get_or_create(current_user.id)
    
    openai_adapter = None
    llama_adapter = None
    
    if settings.llm_provider == "gpt4" and settings.openai_api_key:
        openai_adapter = OpenAIAdapter(api_key=settings.openai_api_key, model="gpt-4")
    elif settings.llm_provider == "llama":
        # Resolve endpoint: prefer user setting, then env var, then global settings default
        resolved_endpoint = (
            settings.llama_endpoint
            or os.getenv("OLLAMA_ENDPOINT")
            or get_settings().ollama_endpoint
        )
        # Normalize localhost values to compose service name when running in docker
        if "localhost" in (resolved_endpoint or ""):
            resolved_endpoint = os.getenv("OLLAMA_ENDPOINT") or get_settings().ollama_endpoint
        llama_adapter = LlamaAdapter(endpoint=resolved_endpoint, model="llama2")
    
    return AIInsightsService(
        provider=settings.llm_provider,
        openai_adapter=openai_adapter,
        llama_adapter=llama_adapter
    )


async def get_chat_assistant_service(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ChatAssistantService:
    """Get chat assistant service with user's settings"""
    from infrastructure.database.user_settings_repository import UserSettingsRepository
    from infrastructure.gpt.openai_adapter import OpenAIAdapter
    from infrastructure.llm.llama_adapter import LlamaAdapter
    
    settings_repo = UserSettingsRepository(session)
    settings = await settings_repo.get_or_create(current_user.id)
    
    openai_adapter = None
    llama_adapter = None
    
    if settings.llm_provider == "gpt4" and settings.openai_api_key:
        openai_adapter = OpenAIAdapter(api_key=settings.openai_api_key, model="gpt-4")
    elif settings.llm_provider == "llama":
        resolved_endpoint = (
            settings.llama_endpoint
            or os.getenv("OLLAMA_ENDPOINT")
            or get_settings().ollama_endpoint
        )
        if "localhost" in (resolved_endpoint or ""):
            resolved_endpoint = os.getenv("OLLAMA_ENDPOINT") or get_settings().ollama_endpoint
        llama_adapter = LlamaAdapter(endpoint=resolved_endpoint, model="llama2")
    
    return ChatAssistantService(
        provider=settings.llm_provider,
        openai_adapter=openai_adapter,
        llama_adapter=llama_adapter
    )


@router.post("/subtasks/suggest", response_model=SubtaskSuggestionsResponse)
async def suggest_subtasks(
    request: SubtaskSuggestionRequest,
    current_user: User = Depends(get_current_user),
    ai_service: AIInsightsService = Depends(get_ai_insights_service),
):
    """Suggest subtasks for a given task using AI"""
    try:
        logger.info(
            f"Subtask suggestion request",
            extra={
                "provider": ai_service.provider,
                "task_title": request.task_title[:50],
                "has_description": bool(request.task_description),
            }
        )

        subtasks = await ai_service.suggest_subtasks(
            task_title=request.task_title,
            task_description=request.task_description
        )

        logger.info(
            f"Subtask suggestion completed",
            extra={
                "provider": ai_service.provider,
                "subtasks_count": len(subtasks),
            }
        )

        return SubtaskSuggestionsResponse(
            subtasks=[SubtaskSuggestion(**st) for st in subtasks],
            provider=ai_service.provider
        )
    except Exception as e:
        logger.error("Subtask suggestion failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate subtask suggestions"
        )


@router.post("/sentiment/analyze", response_model=SentimentAnalysisResponse)
async def analyze_sentiment(
    request: SentimentAnalysisRequest,
    current_user: User = Depends(get_current_user),
    ai_service: AIInsightsService = Depends(get_ai_insights_service),
):
    """Analyze sentiment and urgency from text"""
    try:
        result = await ai_service.analyze_sentiment_urgency(request.text)
        return SentimentAnalysisResponse(**result)
    except Exception as e:
        logger.error("Sentiment analysis failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze sentiment"
        )


@router.post("/duration/estimate", response_model=DurationEstimateResponse)
async def estimate_duration(
    request: DurationEstimateRequest,
    current_user: User = Depends(get_current_user),
    ai_service: AIInsightsService = Depends(get_ai_insights_service),
    session: AsyncSession = Depends(get_db_session),
):
    """Estimate task duration using AI"""
    try:
        repo = PostgreSQLTaskRepository(session)
        historical_tasks, _ = await repo.get_by_user_id(current_user.id, limit=1000)
        
        duration = await ai_service.estimate_duration(
            task_title=request.task_title,
            task_description=request.task_description,
            historical_tasks=historical_tasks
        )
        
        return DurationEstimateResponse(
            estimated_duration=duration,
            confidence=0.7
        )
    except Exception as e:
        logger.error("Duration estimation failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to estimate duration"
        )


@router.post("/scheduling/suggest", response_model=SchedulingSuggestionResponse)
async def suggest_scheduling(
    request: SchedulingSuggestionRequest,
    current_user: User = Depends(get_current_user),
    ai_service: AIInsightsService = Depends(get_ai_insights_service),
    session: AsyncSession = Depends(get_db_session),
):
    """Suggest best time to schedule a task"""
    try:
        repo = PostgreSQLTaskRepository(session)
        task = await repo.get_by_id(UUID(request.task_id))
        
        if not task or task.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        all_tasks, _ = await repo.get_by_user_id(current_user.id, limit=1000)
        
        suggestion = await ai_service.suggest_scheduling(task, all_tasks)
        return SchedulingSuggestionResponse(**suggestion)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Scheduling suggestion failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate scheduling suggestion"
        )


@router.post("/dependencies/detect", response_model=DependenciesResponse)
async def detect_dependencies(
    request: DependencyDetectionRequest,
    current_user: User = Depends(get_current_user),
    ai_service: AIInsightsService = Depends(get_ai_insights_service),
    session: AsyncSession = Depends(get_db_session),
):
    """Detect potential dependencies between tasks"""
    try:
        repo = PostgreSQLTaskRepository(session)
        task = await repo.get_by_id(UUID(request.task_id))
        
        if not task or task.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        all_tasks, _ = await repo.get_by_user_id(current_user.id, limit=1000)
        
        dependencies = await ai_service.detect_dependencies(task, all_tasks)
        
        return DependenciesResponse(
            dependencies=[DependencyResponse(**dep) for dep in dependencies]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Dependency detection failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to detect dependencies"
        )


@router.post("/summary/generate", response_model=SummaryResponse)
async def generate_summary(
    request: SummaryRequest,
    current_user: User = Depends(get_current_user),
    ai_service: AIInsightsService = Depends(get_ai_insights_service),
    session: AsyncSession = Depends(get_db_session),
):
    """Generate AI-powered summary of tasks"""
    try:
        repo = PostgreSQLTaskRepository(session)
        tasks, _ = await repo.get_by_user_id(current_user.id, limit=10000)
        
        summary = await ai_service.generate_summary(tasks, request.period)
        
        return SummaryResponse(**summary)
    except Exception as e:
        logger.error("Summary generation failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate summary"
        )


@router.post("/chat", response_model=ChatMessageResponse)
async def chat_message(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    chat_service: ChatAssistantService = Depends(get_chat_assistant_service),
    session: AsyncSession = Depends(get_db_session),
):
    """Process a chat message and return response"""
    try:
        repo = PostgreSQLTaskRepository(session)
        tasks, _ = await repo.get_by_user_id(current_user.id, limit=1000)
        
        response = await chat_service.process_message(
            message=request.message,
            user_tasks=tasks
        )
        
        return ChatMessageResponse(**response)
    except Exception as e:
        logger.error("Chat processing failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message"
        )


@router.get("/chat/history")
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    chat_service: ChatAssistantService = Depends(get_chat_assistant_service),
):
    """Get chat conversation history"""
    return {"history": chat_service.get_history()}


@router.delete("/chat/history")
async def clear_chat_history(
    current_user: User = Depends(get_current_user),
    chat_service: ChatAssistantService = Depends(get_chat_assistant_service),
):
    """Clear chat conversation history"""
    chat_service.clear_history()
    return {"message": "Chat history cleared"}
