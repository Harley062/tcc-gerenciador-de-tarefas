"""
AI Features API Routes
"""
import logging
from typing import Any, Dict, List, Optional
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

logger = logging.getLogger("sgti")

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
    period: str = "daily"


class SummaryResponse(BaseModel):
    period: str
    summary: dict
    insights: List[str]
    top_completed: List[dict]
    high_priority_pending: List[dict]
    recommendations: List[str]


class ChatMessageRequest(BaseModel):
    message: str


class ChatActionRequest(BaseModel):
    action: str
    task_id: Optional[str] = None
    task_data: Optional[dict] = None


class ChatMessageResponse(BaseModel):
    message: str
    action: Optional[str]
    data: Optional[Any] = None
    requires_confirmation: bool = False
    action_buttons: Optional[List[dict]] = None


class TaskParseRequest(BaseModel):
    text: str


class TaskParseResponse(BaseModel):
    title: str
    description: Optional[str]
    priority: str
    due_date: Optional[str]
    estimated_duration: Optional[int]
    tags: List[str]
    cache_hit: bool


async def get_gpt_service(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Get GPT service with user's settings and Redis cache"""
    from infrastructure.database.user_settings_repository import UserSettingsRepository
    from infrastructure.gpt.openai_adapter import OpenAIAdapter
    from application.services.gpt_service import GPTService
    from infrastructure.cache.redis_cache import RedisCache
    
    settings_repo = UserSettingsRepository(session)
    settings = await settings_repo.get_or_create(current_user.id)
    
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configure sua chave OpenAI em Configurações para usar recursos de IA"
        )
    
    openai_adapter = OpenAIAdapter(api_key=settings.openai_api_key, model="gpt-4o-mini")
    redis_cache = RedisCache(redis_url=get_settings().redis_url)
    
    return GPTService(openai_adapter=openai_adapter, cache=redis_cache)


async def get_ai_insights_service(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AIInsightsService:
    """Get AI insights service with user's settings"""
    from infrastructure.database.user_settings_repository import UserSettingsRepository
    from infrastructure.gpt.openai_adapter import OpenAIAdapter
    
    settings_repo = UserSettingsRepository(session)
    settings = await settings_repo.get_or_create(current_user.id)
    
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configure sua chave OpenAI em Configurações para usar recursos de IA"
        )
    
    openai_adapter = OpenAIAdapter(api_key=settings.openai_api_key, model="gpt-4o-mini")
    
    return AIInsightsService(
        openai_adapter=openai_adapter,
        provider="gpt4"
    )


_chat_services: Dict[str, ChatAssistantService] = {}


async def get_chat_assistant_service(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ChatAssistantService:
    """Get chat assistant service with user's settings - maintains context per user"""
    from infrastructure.database.user_settings_repository import UserSettingsRepository
    from infrastructure.gpt.openai_adapter import OpenAIAdapter
    
    user_id_str = str(current_user.id)
    
    settings_repo = UserSettingsRepository(session)
    settings = await settings_repo.get_or_create(current_user.id)
    
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configure sua chave OpenAI em Configurações para usar recursos de IA"
        )
    
    if user_id_str in _chat_services:
        service = _chat_services[user_id_str]
        repo = PostgreSQLTaskRepository(session)
        service.set_repository(repo, current_user.id)
        return service
    
    openai_adapter = OpenAIAdapter(api_key=settings.openai_api_key, model="gpt-4o-mini")
    repo = PostgreSQLTaskRepository(session)
    
    service = ChatAssistantService(
        openai_adapter=openai_adapter,
        task_repository=repo,
        user_id=current_user.id
    )
    
    _chat_services[user_id_str] = service
    return service


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
        logger.info(
            f"Chat message received",
            extra={
                "user_id": str(current_user.id),
                "message_length": len(request.message),
            }
        )

        repo = PostgreSQLTaskRepository(session)
        tasks, _ = await repo.get_by_user_id(current_user.id, limit=1000)

        logger.info(
            f"Tasks retrieved for chat",
            extra={
                "user_id": str(current_user.id),
                "tasks_count": len(tasks),
            }
        )

        response = await chat_service.process_message(
            message=request.message,
            user_tasks=tasks
        )

        logger.info(
            f"Chat response generated",
            extra={
                "user_id": str(current_user.id),
                "action": response.get("action"),
            }
        )

        return ChatMessageResponse(**response)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Chat processing failed: {str(e)}",
            exc_info=True,
            extra={
                "user_id": str(current_user.id),
                "error_type": type(e).__name__,
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar mensagem: {str(e)}"
        )


@router.get("/agent/status")
async def get_agent_status(
    current_user: User = Depends(get_current_user),
    chat_service: ChatAssistantService = Depends(get_chat_assistant_service),
):
    """Get agent status including executed actions and context"""
    return {
        "agent_mode": chat_service.agent_mode,
        "pending_action": chat_service.last_action_context,
        "pending_tasks_count": len(chat_service.pending_tasks_list),
        "executed_actions": chat_service.executed_actions,
        "history_size": len(chat_service.conversation_history),
    }


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


@router.post("/chat/action")
async def execute_chat_action(
    request: ChatActionRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    gpt_service = Depends(get_gpt_service),
):
    """Execute an action from the chat (create, complete, delete, update)"""
    from uuid import UUID
    from domain.entities.task import Task
    from domain.value_objects.priority import Priority
    from domain.value_objects.task_status import TaskStatus
    from domain.utils.datetime_utils import now_brazil
    
    repo = PostgreSQLTaskRepository(session)
    
    def get_priority(priority_str: str) -> Priority:
        priority_map = {
            "baixa": Priority.BAIXA,
            "low": Priority.BAIXA,
            "media": Priority.MEDIA,
            "medium": Priority.MEDIA,
            "alta": Priority.ALTA,
            "high": Priority.ALTA,
            "urgente": Priority.URGENTE,
            "urgent": Priority.URGENTE,
        }
        return priority_map.get(priority_str.lower(), Priority.MEDIA)
    
    try:
        if request.action == "create":
            if not request.task_data:
                raise HTTPException(status_code=400, detail="Dados da tarefa são obrigatórios")
            
            title = request.task_data.get("title") or request.task_data.get("text")
            if not title:
                raise HTTPException(status_code=400, detail="Título da tarefa é obrigatório")
            
            due_date = None
            due_date_str = request.task_data.get("due_date")
            if due_date_str:
                from datetime import datetime
                from domain.utils.datetime_utils import BRAZIL_TZ
                try:
                    if "T" in due_date_str:
                        due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                        if due_date.tzinfo is not None and str(due_date.tzinfo) != "America/Sao_Paulo":
                            due_date = due_date.astimezone(BRAZIL_TZ)
                    elif " " in due_date_str:
                        due_date = datetime.strptime(due_date_str, "%Y-%m-%d %H:%M")
                        due_date = due_date.replace(tzinfo=BRAZIL_TZ)
                    else:
                        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
                        due_date = due_date.replace(tzinfo=BRAZIL_TZ)
                except Exception as e:
                    logger.warning(f"Could not parse due_date '{due_date_str}': {e}")
            
            priority_str = request.task_data.get("priority", "medium")
            priority = get_priority(priority_str)
            
            task = Task(
                user_id=current_user.id,
                title=title,
                description=request.task_data.get("description", ""),
                status=TaskStatus.TODO,
                priority=priority,
                due_date=due_date,
                estimated_duration=request.task_data.get("estimated_duration"),
                tags=request.task_data.get("tags", []),
            )
            
            created_task = await repo.create(task)
            
            response_msg = f"✅ Tarefa '{created_task.title}' criada com sucesso!"
            if created_task.due_date:
                if created_task.due_date.tzinfo is not None and str(created_task.due_date.tzinfo) == "America/Sao_Paulo":
                    due_brazil = created_task.due_date
                else:
                    from domain.utils.datetime_utils import to_brazil_tz
                    due_brazil = to_brazil_tz(created_task.due_date)
                response_msg += f"\n📅 Agendada para: {due_brazil.strftime('%d/%m/%Y às %H:%M')}"
            
            return {
                "success": True,
                "message": response_msg,
                "task": {
                    "id": str(created_task.id),
                    "title": created_task.title,
                    "status": created_task.status.value if hasattr(created_task.status, 'value') else str(created_task.status),
                    "priority": created_task.priority.value if hasattr(created_task.priority, 'value') else str(created_task.priority),
                    "due_date": created_task.due_date.isoformat() if created_task.due_date else None
                }
            }
        
        elif request.action == "complete":
            if not request.task_id:
                raise HTTPException(status_code=400, detail="ID da tarefa é obrigatório")
            
            task = await repo.get_by_id(UUID(request.task_id))
            if not task or task.user_id != current_user.id:
                raise HTTPException(status_code=404, detail="Tarefa não encontrada")
            
            task.status = TaskStatus.DONE
            task.completed_at = now_brazil()
            updated_task = await repo.update(task)
            
            return {
                "success": True,
                "message": f"✅ Tarefa '{updated_task.title}' marcada como concluída!",
                "task": {
                    "id": str(updated_task.id),
                    "title": updated_task.title,
                    "status": "done"
                }
            }
        
        elif request.action == "delete":
            if not request.task_id:
                raise HTTPException(status_code=400, detail="ID da tarefa é obrigatório")
            
            task = await repo.get_by_id(UUID(request.task_id))
            if not task or task.user_id != current_user.id:
                raise HTTPException(status_code=404, detail="Tarefa não encontrada")
            
            title = task.title
            await repo.delete(UUID(request.task_id))
            
            return {
                "success": True,
                "message": f"🗑️ Tarefa {title} deletada com sucesso!"
            }
        
        elif request.action == "update_status":
            if not request.task_id or not request.task_data:
                raise HTTPException(status_code=400, detail="ID e dados da tarefa são obrigatórios")
            
            task = await repo.get_by_id(UUID(request.task_id))
            if not task or task.user_id != current_user.id:
                raise HTTPException(status_code=404, detail="Tarefa não encontrada")
            
            new_status = request.task_data.get("status", "in_progress")
            task.status = TaskStatus.from_string(new_status)
            
            if new_status == "done":
                task.completed_at = now_brazil()
            
            updated_task = await repo.update(task)
            
            status_labels = {
                "todo": "A Fazer",
                "in_progress": "Em Progresso", 
                "done": "Concluída",
                "pending": "Pendente"
            }
            
            return {
                "success": True,
                "message": f"✅ Status de '{updated_task.title}' alterado para {status_labels.get(new_status, new_status)}!",
                "task": {
                    "id": str(updated_task.id),
                    "title": updated_task.title,
                    "status": new_status
                }
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Ação desconhecida: {request.action}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat action failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao executar ação: {str(e)}")


@router.post("/tasks/parse", response_model=TaskParseResponse)
async def parse_task(
    request: TaskParseRequest,
    current_user: User = Depends(get_current_user),
    gpt_service = Depends(get_gpt_service),
):
    """Parse natural language text into structured task data using GPT-4"""
    try:
        logger.info(
            f"Task parse request",
            extra={
                "text_length": len(request.text),
                "user_id": str(current_user.id),
            }
        )

        parsed_task, metadata = await gpt_service.parse_task(request.text)
        
        logger.info(
            f"Task parse completed",
            extra={
                "cache_hit": metadata.get("cache_hit", False),
                "title": parsed_task.title[:50],
            }
        )

        return TaskParseResponse(
            title=parsed_task.title,
            description=parsed_task.description,
            priority=parsed_task.priority,
            due_date=parsed_task.due_date.isoformat() if parsed_task.due_date else None,
            estimated_duration=parsed_task.estimated_duration,
            tags=parsed_task.tags,
            cache_hit=metadata.get("cache_hit", False)
        )
    except Exception as e:
        logger.error("Task parse failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse task from natural language"
        )
