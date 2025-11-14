"""
AI Insights Service - Provides intelligent analysis and suggestions for tasks
"""
import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta
from uuid import UUID

from domain.entities.task import Task
from infrastructure.gpt.openai_adapter import OpenAIAdapter
from infrastructure.llm.llama_adapter import LlamaAdapter

logger = logging.getLogger("taskmaster")


class AIInsightsService:
    """Service for AI-powered insights and analysis"""
    
    def __init__(
        self,
        openai_adapter: Optional[OpenAIAdapter] = None,
        llama_adapter: Optional[LlamaAdapter] = None,
        provider: str = "regex"
    ):
        self.openai_adapter = openai_adapter
        self.llama_adapter = llama_adapter
        self.provider = provider
    
    async def suggest_subtasks(
        self, 
        task_title: str, 
        task_description: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Suggest subtasks for a given task using AI"""
        try:
            if self.provider == "gpt4" and self.openai_adapter:
                return await self._suggest_subtasks_gpt(task_title, task_description)
            elif self.provider == "llama" and self.llama_adapter:
                return await self._suggest_subtasks_llama(task_title, task_description)
            else:
                return await self._suggest_subtasks_heuristic(task_title, task_description)
        except Exception as e:
            logger.error(f"Subtask suggestion failed: {e}")
            return []
    
    async def _suggest_subtasks_gpt(
        self, 
        task_title: str, 
        task_description: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Use GPT-4 to suggest subtasks"""
        prompt = f"""Given this task, suggest 3-5 logical subtasks to break it down:

Task: {task_title}
{f'Description: {task_description}' if task_description else ''}

Return a JSON array of subtasks with this format:
[
  {{"title": "Subtask 1", "description": "Details", "estimated_duration": 30}},
  {{"title": "Subtask 2", "description": "Details", "estimated_duration": 45}}
]

Keep subtasks specific, actionable, and in logical order."""
        
        result = await self.openai_adapter.generate_completion(
            prompt=prompt,
            response_format={"type": "json_object"}
        )
        
        import json
        subtasks = json.loads(result.get("content", "[]"))
        return subtasks if isinstance(subtasks, list) else subtasks.get("subtasks", [])
    
    async def _suggest_subtasks_llama(
        self, 
        task_title: str, 
        task_description: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Use Llama to suggest subtasks"""
        return await self.llama_adapter.suggest_subtasks(task_title, task_description)
    
    async def _suggest_subtasks_heuristic(
        self, 
        task_title: str, 
        task_description: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Use heuristic rules to suggest subtasks"""
        subtasks = []
        title_lower = task_title.lower()
        
        if any(word in title_lower for word in ["desenvolver", "criar", "implementar", "build", "develop", "create"]):
            subtasks.extend([
                {"title": f"Planejar {task_title}", "description": "Definir requisitos e arquitetura", "estimated_duration": 30},
                {"title": f"Implementar {task_title}", "description": "Desenvolver a funcionalidade", "estimated_duration": 120},
                {"title": f"Testar {task_title}", "description": "Criar e executar testes", "estimated_duration": 45},
                {"title": f"Documentar {task_title}", "description": "Escrever documentação", "estimated_duration": 30},
            ])
        elif any(word in title_lower for word in ["bug", "erro", "corrigir", "fix"]):
            subtasks.extend([
                {"title": "Reproduzir o bug", "description": "Identificar passos para reproduzir", "estimated_duration": 15},
                {"title": "Investigar causa", "description": "Analisar código e logs", "estimated_duration": 30},
                {"title": "Implementar correção", "description": "Corrigir o problema", "estimated_duration": 45},
                {"title": "Testar correção", "description": "Verificar que o bug foi resolvido", "estimated_duration": 20},
            ])
        elif any(word in title_lower for word in ["reunião", "meeting", "apresentação", "presentation"]):
            subtasks.extend([
                {"title": "Preparar agenda", "description": "Definir tópicos a discutir", "estimated_duration": 15},
                {"title": "Preparar materiais", "description": "Criar slides ou documentos", "estimated_duration": 60},
                {"title": "Realizar reunião", "description": "Conduzir a reunião", "estimated_duration": 60},
                {"title": "Documentar decisões", "description": "Registrar ações e próximos passos", "estimated_duration": 15},
            ])
        else:
            subtasks.extend([
                {"title": f"Iniciar {task_title}", "description": "Começar a trabalhar na tarefa", "estimated_duration": 30},
                {"title": f"Executar {task_title}", "description": "Realizar o trabalho principal", "estimated_duration": 60},
                {"title": f"Revisar {task_title}", "description": "Verificar qualidade", "estimated_duration": 20},
            ])
        
        return subtasks[:5]
    
    async def analyze_sentiment_urgency(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment and urgency from task text"""
        text_lower = text.lower()
        
        urgency_keywords = {
            "urgent": ["urgente", "urgent", "asap", "imediato", "immediate", "crítico", "critical"],
            "high": ["importante", "important", "prioritário", "priority", "logo", "soon"],
            "low": ["quando der", "eventually", "algum dia", "someday", "se possível", "if possible"]
        }
        
        priority = "medium"
        urgency_score = 0.5
        
        for level, keywords in urgency_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                if level == "urgent":
                    priority = "high"
                    urgency_score = 1.0
                elif level == "high":
                    priority = "high"
                    urgency_score = 0.8
                elif level == "low":
                    priority = "low"
                    urgency_score = 0.2
                break
        
        sentiment_positive = any(word in text_lower for word in ["ótimo", "excelente", "bom", "great", "excellent", "good"])
        sentiment_negative = any(word in text_lower for word in ["problema", "bug", "erro", "falha", "problem", "error", "issue"])
        
        return {
            "priority": priority,
            "urgency_score": urgency_score,
            "sentiment": "positive" if sentiment_positive else "negative" if sentiment_negative else "neutral",
            "confidence": 0.7
        }
    
    async def estimate_duration(
        self, 
        task_title: str, 
        task_description: Optional[str] = None,
        historical_tasks: Optional[List[Task]] = None
    ) -> int:
        """Estimate task duration in minutes based on content and history"""
        base_duration = 60
        
        text = f"{task_title} {task_description or ''}".lower()
        
        if any(word in text for word in ["rápido", "quick", "simples", "simple"]):
            base_duration = 30
        elif any(word in text for word in ["complexo", "complex", "grande", "large", "desenvolver", "develop"]):
            base_duration = 180
        elif any(word in text for word in ["reunião", "meeting"]):
            base_duration = 60
        elif any(word in text for word in ["bug", "erro", "fix"]):
            base_duration = 45
        
        if historical_tasks:
            similar_durations = []
            for task in historical_tasks[-10:]:
                if task.actual_duration and any(
                    word in task.title.lower() 
                    for word in task_title.lower().split()[:3]
                ):
                    similar_durations.append(task.actual_duration)
            
            if similar_durations:
                avg_duration = sum(similar_durations) / len(similar_durations)
                base_duration = int((base_duration + avg_duration) / 2)
        
        return base_duration
    
    async def suggest_scheduling(
        self, 
        task: Task,
        existing_tasks: List[Task]
    ) -> Dict[str, Any]:
        """Suggest best time to schedule a task"""
        now = datetime.utcnow()
        
        if task.due_date:
            days_until_due = (task.due_date - now).days
            if days_until_due <= 1:
                suggestion = "hoje"
                suggested_time = now.replace(hour=9, minute=0)
            elif days_until_due <= 3:
                suggestion = "amanhã"
                suggested_time = (now + timedelta(days=1)).replace(hour=9, minute=0)
            else:
                suggestion = f"em {days_until_due - 1} dias"
                suggested_time = (now + timedelta(days=days_until_due - 1)).replace(hour=9, minute=0)
        else:
            if task.priority == "high":
                suggestion = "hoje"
                suggested_time = now.replace(hour=9, minute=0)
            elif task.priority == "medium":
                suggestion = "esta semana"
                suggested_time = (now + timedelta(days=2)).replace(hour=10, minute=0)
            else:
                suggestion = "próxima semana"
                suggested_time = (now + timedelta(days=7)).replace(hour=14, minute=0)
        
        return {
            "suggestion": suggestion,
            "suggested_time": suggested_time.isoformat(),
            "reason": f"Baseado na prioridade {task.priority}" + (f" e prazo em {days_until_due} dias" if task.due_date else ""),
            "confidence": 0.8
        }
    
    async def detect_dependencies(
        self, 
        task: Task,
        all_tasks: List[Task]
    ) -> List[Dict[str, Any]]:
        """Detect potential dependencies between tasks"""
        dependencies = []
        task_words = set(task.title.lower().split())
        
        for other_task in all_tasks:
            if other_task.id == task.id or other_task.status == "done":
                continue
            
            other_words = set(other_task.title.lower().split())
            common_words = task_words & other_words
            
            if len(common_words) >= 2:
                dependencies.append({
                    "task_id": str(other_task.id),
                    "task_title": other_task.title,
                    "relationship": "related",
                    "confidence": len(common_words) / max(len(task_words), len(other_words)),
                    "reason": f"Tarefas compartilham palavras-chave: {', '.join(list(common_words)[:3])}"
                })
            
            if any(word in task.title.lower() for word in ["testar", "test", "deploy"]):
                if any(word in other_task.title.lower() for word in ["desenvolver", "implement", "criar", "create"]):
                    dependencies.append({
                        "task_id": str(other_task.id),
                        "task_title": other_task.title,
                        "relationship": "blocks",
                        "confidence": 0.8,
                        "reason": "Desenvolvimento deve ser concluído antes de testes/deploy"
                    })
        
        return sorted(dependencies, key=lambda x: x["confidence"], reverse=True)[:5]
    
    async def generate_summary(
        self, 
        tasks: List[Task],
        period: str = "daily"
    ) -> Dict[str, Any]:
        """Generate AI-powered summary of tasks"""
        def get_status(task):
            return task.status.value if hasattr(task.status, 'value') else str(task.status)
        
        def get_priority(task):
            return task.priority.value if hasattr(task.priority, 'value') else str(task.priority)
        
        def get_due_date(task):
            if hasattr(task.due_date, 'isoformat'):
                return task.due_date.isoformat()
            elif isinstance(task.due_date, str):
                return task.due_date
            return None
        
        def get_duration(task):
            val = task.actual_duration if task.actual_duration is not None else (task.estimated_duration or 0)
            if isinstance(val, (int, float)):
                return int(val)
            elif isinstance(val, str) and val.isdigit():
                return int(val)
            return 0
        
        completed = [t for t in tasks if get_status(t) == "done"]
        in_progress = [t for t in tasks if get_status(t) == "in_progress"]
        todo = [t for t in tasks if get_status(t) == "todo"]
        
        total_time = sum(get_duration(t) for t in completed)
        
        high_priority_pending = [t for t in todo + in_progress if get_priority(t) == "high"]
        
        insights = []
        if len(completed) > 5:
            insights.append("🎉 Excelente produtividade! Você completou muitas tarefas.")
        elif len(completed) == 0:
            insights.append("💡 Nenhuma tarefa concluída ainda. Que tal começar pela mais importante?")
        
        if len(high_priority_pending) > 3:
            insights.append(f"⚠️ Você tem {len(high_priority_pending)} tarefas de alta prioridade pendentes.")
        
        if len(in_progress) > 5:
            insights.append("🎯 Muitas tarefas em progresso. Considere focar em finalizar algumas antes de iniciar novas.")
        
        return {
            "period": period,
            "summary": {
                "completed": len(completed),
                "in_progress": len(in_progress),
                "todo": len(todo),
                "total_time_minutes": total_time
            },
            "insights": insights,
            "top_completed": [{"title": t.title, "priority": get_priority(t)} for t in completed[:5]],
            "high_priority_pending": [{"title": t.title, "due_date": get_due_date(t)} for t in high_priority_pending[:5]],
            "recommendations": [
                "Foque em tarefas de alta prioridade primeiro",
                "Divida tarefas grandes em subtarefas menores",
                "Reserve tempo para revisar tarefas concluídas"
            ]
        }
