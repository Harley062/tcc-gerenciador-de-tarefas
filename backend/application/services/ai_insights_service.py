"""
AI Insights Service - Provides intelligent analysis and suggestions for tasks
"""
import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta
from uuid import UUID

from domain.entities.task import Task
from infrastructure.gpt.openai_adapter import OpenAIAdapter

logger = logging.getLogger("sgti")


class AIInsightsService:
    """Service for AI-powered insights and analysis using GPT-4 only"""
    
    def __init__(
        self,
        openai_adapter: OpenAIAdapter,
        llama_adapter: Optional[Any] = None,
        provider: str = "gpt4"
    ):
        self.openai_adapter = openai_adapter
        self.provider = provider
    
    async def suggest_subtasks(
        self,
        task_title: str,
        task_description: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Suggest subtasks for a given task using GPT-4 only"""
        if self.provider == "gpt4" and self.openai_adapter:
            logger.info(f"Using GPT-4 for subtask suggestions")
            subtasks = await self._suggest_subtasks_gpt(task_title, task_description)
            return subtasks
        else:
            raise ValueError(f"GPT-4 provider not configured. Current provider: {self.provider}")
    
    async def _suggest_subtasks_gpt(
        self,
        task_title: str,
        task_description: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Use GPT-4 to suggest subtasks"""
        prompt = f"""Dada esta tarefa, sugira 3-5 subtarefas lógicas para dividi-la:

Tarefa: {task_title}
{f'Descrição: {task_description}' if task_description else ''}

Retorne um objeto JSON com um campo "subtasks" contendo um array de subtarefas no seguinte formato EXATO:

{{
  "subtasks": [
    {{
      "title": "Nome da subtarefa 1",
      "description": "Descrição detalhada da subtarefa 1",
      "estimated_duration": 30
    }},
    {{
      "title": "Nome da subtarefa 2",
      "description": "Descrição detalhada da subtarefa 2",
      "estimated_duration": 45
    }}
  ]
}}

REGRAS OBRIGATÓRIAS:
- Todas as subtarefas DEVEM estar em PORTUGUÊS BRASILEIRO
- Mantenha as subtarefas específicas, acionáveis e em ordem lógica
- Use linguagem clara e profissional em português
- Retorne APENAS o objeto JSON, sem texto adicional
- O campo "subtasks" deve conter um array com 3-5 subtarefas"""
        
        result = await self.openai_adapter.generate_completion(
            prompt=prompt,
            response_format={"type": "json_object"}
        )

        import json
        logger.info(f"GPT-4 raw response: {result}")

        content = result.get("content", "{}")
        logger.info(f"GPT-4 content: {content}")

        parsed = json.loads(content)
        logger.info(f"Parsed JSON: {parsed}")

        if isinstance(parsed, list):
            subtasks = parsed
        elif isinstance(parsed, dict):
            subtasks = parsed.get("subtasks", parsed.get("array", []))
        else:
            subtasks = []

        logger.info(f"Final subtasks: {subtasks}")
        return subtasks
    
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
        """Suggest best time to schedule a task using GPT-4"""
        if self.provider == "gpt4" and self.openai_adapter:
            logger.info(f"Using GPT-4 for scheduling suggestion")
            return await self._suggest_scheduling_gpt(task, existing_tasks)
        else:
            raise ValueError(f"GPT-4 provider not configured. Current provider: {self.provider}")
    
    async def _suggest_scheduling_gpt(
        self,
        task: Task,
        existing_tasks: List[Task]
    ) -> Dict[str, Any]:
        """Use GPT-4 to suggest optimal scheduling for a task"""
        now = datetime.utcnow()
        
        task_context = f"""
Tarefa para agendar:
- Título: {task.title}
- Descrição: {task.description or 'N/A'}
- Prioridade: {task.priority}
- Data de Vencimento: {task.due_date.isoformat() if task.due_date else 'Não definida'}
- Duração Estimada: {task.estimated_duration or 'Desconhecida'} minutos

Data/hora atual: {now.isoformat()}

Tarefas existentes (para contexto):
"""

        for t in existing_tasks[:10]:
            task_context += f"- {t.title} (Prioridade: {t.priority}, Status: {t.status}"
            if t.due_date:
                task_context += f", Vencimento: {t.due_date.isoformat()}"
            task_context += ")\n"

        prompt = f"""{task_context}

Com base nos detalhes da tarefa e na carga de trabalho existente, sugira o momento ideal para agendar esta tarefa.

Retorne um objeto JSON com esta estrutura exata:
{{
  "suggestion": "string (ex: 'hoje', 'amanhã', 'em 3 dias')",
  "suggested_time": "string ISO datetime",
  "reason": "string explicando o raciocínio em português brasileiro",
  "confidence": número entre 0 e 1
}}

Considere:
1. Prioridade e urgência da tarefa
2. Restrições de prazo de vencimento
3. Carga de trabalho existente e distribuição de tarefas
4. Horário ideal do dia para este tipo de tarefa
5. Tempo de buffer antes do prazo

IMPORTANTE: Todos os textos devem estar em PORTUGUÊS BRASILEIRO.
Retorne APENAS o objeto JSON, sem texto adicional."""
        
        try:
            result = await self.openai_adapter.generate_completion(
                prompt=prompt,
                response_format={"type": "json_object"}
            )
            
            import json
            scheduling_data = json.loads(result.get("content", "{}"))
            
            required_fields = ["suggestion", "suggested_time", "reason", "confidence"]
            if not all(field in scheduling_data for field in required_fields):
                raise ValueError(f"GPT-4 response missing required fields. Got: {scheduling_data.keys()}")
            
            logger.info(
                "GPT-4 scheduling suggestion completed",
                extra={
                    "task_id": str(task.id),
                    "suggestion": scheduling_data.get("suggestion"),
                    "confidence": scheduling_data.get("confidence")
                }
            )
            
            return scheduling_data
            
        except Exception as e:
            logger.error(
                "GPT-4 scheduling suggestion failed",
                extra={
                    "error": str(e),
                    "task_id": str(task.id)
                }
            )
            raise Exception(f"Failed to generate scheduling suggestion with GPT-4: {str(e)}")
    
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
        """Generate AI-powered summary of tasks based on real data"""
        from datetime import timedelta
        from domain.utils.datetime_utils import utcnow_aware
        
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
        
        def make_aware(dt):
            """Converte datetime naive para aware (UTC) se necessário"""
            if dt is None:
                return None
            if dt.tzinfo is None:
                from datetime import timezone
                return dt.replace(tzinfo=timezone.utc)
            return dt
        
        now = utcnow_aware()
        if period == "daily":
            period_start = now - timedelta(days=1)
        elif period == "weekly":
            period_start = now - timedelta(days=7)
        else:
            period_start = now - timedelta(days=30)
        
        period_tasks = [t for t in tasks if t.created_at and make_aware(t.created_at) >= period_start]
        
        completed = [t for t in tasks if get_status(t) in ["done", "concluida"]]
        in_progress = [t for t in tasks if get_status(t) in ["in_progress", "em_progresso"]]
        todo = [t for t in tasks if get_status(t) in ["todo", "a_fazer", "pending"]]
        
        completed_in_period = [
            t for t in completed 
            if t.completed_at and make_aware(t.completed_at) >= period_start
        ]
        
        total_time = sum(get_duration(t) for t in completed)
        
        high_priority_pending = [t for t in todo + in_progress if get_priority(t) in ["high", "alta", "urgente", "urgent"]]
        
        overdue_tasks = [
            t for t in todo + in_progress 
            if t.due_date and make_aware(t.due_date) < now
        ]
        
        insights = []
        
        total_active = len(todo) + len(in_progress)
        
        if len(completed_in_period) > 0:
            if len(completed_in_period) >= 5:
                insights.append(f"🎉 Excelente produtividade! Você completou {len(completed_in_period)} tarefas neste período.")
            elif len(completed_in_period) >= 2:
                insights.append(f"👍 Bom progresso! {len(completed_in_period)} tarefas concluídas neste período.")
            else:
                insights.append(f"📝 Você concluiu {len(completed_in_period)} tarefa neste período. Continue focado!")
        else:
            if total_active > 0:
                insights.append("💡 Nenhuma tarefa concluída ainda neste período. Que tal começar pela mais importante?")
            else:
                insights.append("📋 Você não tem tarefas ativas. Crie novas tarefas para começar!")
        
        if len(overdue_tasks) > 0:
            insights.append(f"⚠️ ATENÇÃO: {len(overdue_tasks)} tarefas estão atrasadas e precisam de ação imediata.")
        
        if len(high_priority_pending) > 3:
            insights.append(f"🔴 Você tem {len(high_priority_pending)} tarefas de alta prioridade pendentes. Priorize-as!")
        elif len(high_priority_pending) > 0:
            insights.append(f"📌 {len(high_priority_pending)} tarefas de alta prioridade aguardam conclusão.")
        
        if len(in_progress) > 5:
            insights.append("🎯 Muitas tarefas em progresso. Considere focar em finalizar algumas antes de iniciar novas.")
        
        if total_active == 0 and len(completed) > 0:
            insights.append("✅ Parabéns! Todas as tarefas foram concluídas. Que tal planejar novas metas?")
        
        recommendations = []
        
        if len(overdue_tasks) > 0:
            recommendations.append(f"🚨 Resolva as {len(overdue_tasks)} tarefas atrasadas - elas impactam sua produtividade.")
        
        if len(high_priority_pending) > 0:
            recommendations.append("⭐ Comece seu dia pelas tarefas de alta prioridade para maximizar resultados.")
        
        if len(in_progress) > 3:
            recommendations.append("🎯 Finalize tarefas em andamento antes de iniciar novas para manter o foco.")
        
        if total_time > 0:
            hours = total_time // 60
            minutes = total_time % 60
            if hours > 0:
                recommendations.append(f"⏱️ Você investiu {hours}h{minutes}min em tarefas. Continue o bom trabalho!")
            else:
                recommendations.append(f"⏱️ Você investiu {minutes} minutos em tarefas. Continue focado!")
        
        if len(todo) > 10:
            recommendations.append("📝 Sua lista de tarefas está grande. Considere priorizar ou delegar algumas.")
        
        if len(completed) > 0 and len(todo) == 0 and len(in_progress) == 0:
            recommendations.append("🌟 Incrível! Você zerou sua lista de tarefas. Planeje os próximos passos!")
        
        if len(recommendations) == 0:
            recommendations.append("📅 Defina prazos para suas tarefas para manter o foco.")
            recommendations.append("🔄 Revise suas tarefas diariamente para manter a produtividade.")
        
        return {
            "period": period,
            "summary": {
                "completed": len(completed),
                "in_progress": len(in_progress),
                "todo": len(todo),
                "total_time_minutes": total_time
            },
            "insights": insights,
            "top_completed": [{"title": t.title, "priority": get_priority(t)} for t in completed_in_period[:5]],
            "high_priority_pending": [{"title": t.title, "due_date": get_due_date(t)} for t in high_priority_pending[:5]],
            "recommendations": recommendations[:4]
        }
