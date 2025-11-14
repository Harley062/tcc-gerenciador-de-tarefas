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
) -> AIInsightsService:
    """Get AI insights service with user's settings"""
    return AIInsightsService(provider="regex")


async def get_chat_assistant_service(
    current_user: User = Depends(get_current_user),
) -> ChatAssistantService:
    """Get chat assistant service with user's settings"""
    return ChatAssistantService(provider="regex")


@router.post("/subtasks/suggest", response_model=SubtaskSuggestionsResponse)
async def suggest_subtasks(
    request: SubtaskSuggestionRequest,
    current_user: User = Depends(get_current_user),
    ai_service: AIInsightsService = Depends(get_ai_insights_service),
):
    """Suggest subtasks for a given task using AI"""
    try:
        subtasks = await ai_service.suggest_subtasks(
            task_title=request.task_title,
            task_description=request.task_description
        )
        
        return SubtaskSuggestionsResponse(
            subtasks=[SubtaskSuggestion(**st) for st in subtasks],
            provider=ai_service.provider
        )
    except Exception as e:
        logger.error(f"Subtask suggestion failed: {e}")
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
        logger.error(f"Sentiment analysis failed: {e}")
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
        historical_tasks = await repo.get_by_user(current_user.id)
        
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
        logger.error(f"Duration estimation failed: {e}")
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
        
        all_tasks = await repo.get_by_user(current_user.id)
        
        suggestion = await ai_service.suggest_scheduling(task, all_tasks)
        return SchedulingSuggestionResponse(**suggestion)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scheduling suggestion failed: {e}")
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
        
        all_tasks = await repo.get_by_user(current_user.id)
        
        dependencies = await ai_service.detect_dependencies(task, all_tasks)
        
        return DependenciesResponse(
            dependencies=[DependencyResponse(**dep) for dep in dependencies]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dependency detection failed: {e}")
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
        tasks = await repo.get_by_user(current_user.id)
        
        summary = await ai_service.generate_summary(tasks, request.period)
        
        return SummaryResponse(**summary)
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
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
        tasks = await repo.get_by_user(current_user.id)
        
        response = await chat_service.process_message(
            message=request.message,
            user_tasks=tasks
        )
        
        return ChatMessageResponse(**response)
    except Exception as e:
        logger.error(f"Chat processing failed: {e}")
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
