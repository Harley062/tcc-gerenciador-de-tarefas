"""
Chat Assistant Service - AI Agent for autonomous task management
"""
import logging
import random
from typing import Any, Optional, List, Dict, Callable, Awaitable
from datetime import datetime, timedelta, timezone
from uuid import UUID

from domain.entities.task import Task
from domain.utils.datetime_utils import now_brazil, to_brazil_tz, BRAZIL_TZ
from infrastructure.gpt.openai_adapter import OpenAIAdapter

logger = logging.getLogger("sgti")


class ChatAssistantService:
    """
    AI Agent for autonomous task management.
    
    This agent can:
    - Execute actions directly (create, complete, delete tasks)
    - Chain multiple actions in a single conversation
    - Maintain context across messages
    - Use natural language understanding via GPT
    """

    MAX_HISTORY_SIZE = 30  # Maximum number of messages to keep in history

    def __init__(
        self,
        openai_adapter: OpenAIAdapter,
        task_repository = None,  # Optional: for direct execution
        user_id: UUID = None,
    ):
        self.openai_adapter = openai_adapter
        self.task_repository = task_repository
        self.user_id = user_id
        self.conversation_history = []
        self.last_action_context = None  # Store context of last action for follow-up
        self.pending_tasks_list = []  # Store task list for selection
        self.agent_mode = True  # Agent executes actions directly when possible
        self.executed_actions = []  # Track actions executed in current session
    
    def set_repository(self, repository, user_id: UUID):
        """Set the task repository for direct execution"""
        self.task_repository = repository
        self.user_id = user_id
    
    async def execute_action(self, action: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an action directly.
        
        Actions:
        - create: Create a new task
        - complete: Mark task as done  
        - delete: Delete a task
        - update_status: Update task status
        """
        if not self.task_repository or not self.user_id:
            return {
                "success": False,
                "message": "❌ Repositório não configurado para execução direta.",
                "requires_manual_action": True
            }
        
        try:
            from domain.value_objects.task_status import TaskStatus
            
            if action == "complete":
                task_id = data.get("task_id")
                if not task_id:
                    return {"success": False, "message": "ID da tarefa não fornecido"}
                
                task = await self.task_repository.get_by_id(UUID(task_id))
                if not task or task.user_id != self.user_id:
                    return {"success": False, "message": "Tarefa não encontrada"}
                
                task.status = TaskStatus.DONE
                task.completed_at = now_brazil()
                await self.task_repository.update(task)
                
                self.executed_actions.append({
                    "action": "complete",
                    "task_id": task_id,
                    "task_title": task.title,
                    "timestamp": now_brazil().isoformat()
                })
                
                return {
                    "success": True,
                    "message": f"✅ Tarefa '{task.title}' concluída com sucesso!",
                    "task": {"id": task_id, "title": task.title, "status": "done"}
                }
            
            elif action == "delete":
                task_id = data.get("task_id")
                if not task_id:
                    return {"success": False, "message": "ID da tarefa não fornecido"}
                
                task = await self.task_repository.get_by_id(UUID(task_id))
                if not task or task.user_id != self.user_id:
                    return {"success": False, "message": "Tarefa não encontrada"}
                
                title = task.title
                await self.task_repository.delete(UUID(task_id))
                
                self.executed_actions.append({
                    "action": "delete",
                    "task_id": task_id,
                    "task_title": title,
                    "timestamp": now_brazil().isoformat()
                })
                
                return {
                    "success": True,
                    "message": f"🗑️ Tarefa '{title}' deletada!",
                }
            
            else:
                return {"success": False, "message": f"Ação '{action}' não suportada para execução direta"}
                
        except Exception as e:
            logger.error(f"Agent action execution failed: {e}", exc_info=True)
            return {"success": False, "message": f"Erro ao executar ação: {str(e)}"}
    
    async def process_message(
        self,
        message: str,
        user_tasks: List[Task],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process a chat message and return appropriate response with actions"""

        try:
            logger.info(
                "Processing chat message",
                extra={
                    "message_length": len(message),
                    "tasks_count": len(user_tasks),
                    "history_size": len(self.conversation_history)
                }
            )

            self.conversation_history.append({
                "role": "user",
                "content": message,
                "timestamp": now_brazil().isoformat()
            })

            message_lower = message.lower()

            intent = self._detect_intent(message_lower)

            logger.info(
                "Intent detected",
                extra={"intent": intent, "message_preview": message[:50]}
            )

            if intent == "greeting":
                response = await self._handle_greeting(user_tasks)
            elif intent == "thanks":
                response = self._handle_thanks()
            elif intent == "suggest_next_task":
                response = await self._handle_suggest_next_task(user_tasks)
            elif intent == "list_tasks":
                response = await self._handle_list_tasks(message_lower, user_tasks)
            elif intent == "create_task":
                response = await self._handle_create_task(message, user_tasks)
            elif intent == "complete_task":
                response = await self._handle_complete_task(message_lower, user_tasks)
                # Save context for follow-up selection
                if response.get("action") == "select_complete":
                    self.last_action_context = "complete"
                    self.pending_tasks_list = response.get("data", [])
            elif intent == "select_complete":
                response = await self._handle_task_selection(message_lower, user_tasks, "complete")
            elif intent == "update_task":
                response = await self._handle_update_task(message_lower, user_tasks)
            elif intent == "delete_task":
                response = await self._handle_delete_task(message_lower, user_tasks)
                # Save context for follow-up selection
                if response.get("action") == "select_delete":
                    self.last_action_context = "delete"
                    self.pending_tasks_list = response.get("data", [])
            elif intent == "select_delete":
                response = await self._handle_task_selection(message_lower, user_tasks, "delete")
            elif intent == "task_status":
                response = await self._handle_task_status(message_lower, user_tasks)
            elif intent == "help":
                response = self._handle_help()
            else:
                response = await self._handle_general_query(message, user_tasks)

            self.conversation_history.append({
                "role": "assistant",
                "content": response.get("message", ""),
                "timestamp": now_brazil().isoformat()
            })

            # Trim history to prevent unlimited growth
            if len(self.conversation_history) > self.MAX_HISTORY_SIZE:
                self.conversation_history = self.conversation_history[-self.MAX_HISTORY_SIZE:]

            return response
        except Exception as e:
            logger.error(
                f"Error processing chat message: {str(e)}",
                exc_info=True,
                extra={
                    "message_preview": message[:50] if message else "",
                    "error_type": type(e).__name__,
                }
            )
            return {
                "message": "Desculpe, ocorreu um erro. Tente novamente ou digite 'ajuda' para ver os comandos disponíveis.",
                "action": None,
                "data": None
            }
    
    def _detect_intent(self, message: str) -> str:
        """Detect user intent from message with improved accuracy"""

        # Check if user is responding with a number (selection from previous list)
        message_stripped = message.strip()
        if message_stripped.isdigit() and self.last_action_context:
            # User is selecting from a list
            return f"select_{self.last_action_context}"

        # Check for greetings
        greetings = ["oi", "olá", "ola", "hey", "hi", "hello", "bom dia", "boa tarde", "boa noite", "e aí", "eai", "eae"]
        if any(message_stripped.lower() == g or message_stripped.lower().startswith(g + " ") for g in greetings):
            return "greeting"

        # Check for thanks
        thanks = ["obrigado", "obrigada", "valeu", "thanks", "thank you", "vlw", "brigado", "brigada"]
        if any(word in message.lower() for word in thanks):
            return "thanks"

        # Keywords for each intent with priority order
        list_keywords = ["listar", "mostrar", "quais", "ver", "exibir", "list", "show", "what", "display", "me mostre", "me mostra", "tenho", "tem", "há", "minhas"]
        task_keywords = ["tarefa", "tarefas", "task", "tasks", "todo", "todos", "atividade", "atividades", "fazer", "pendente", "pendentes"]
        time_keywords = ["hoje", "amanhã", "semana", "mês", "today", "tomorrow", "week", "month", "agora", "próximo", "próxima"]
        status_filter_keywords = ["pendente", "pendentes", "progresso", "concluída", "concluídas", "pending", "done", "completed", "in progress", "atrasada", "atrasadas"]
        priority_keywords = ["alta", "high", "urgente", "urgent", "prioridade", "priority", "importante", "important"]

        # EXPANDED create keywords with verb conjugations
        create_keywords = ["criar", "crie", "cria", "adicionar", "adicione", "nova", "novo", "create", "add", "new", "cadastrar", "registrar", "agendar", "agende", "marcar", "marque"]
        update_keywords = ["atualizar", "modificar", "mudar", "alterar", "editar", "update", "modify", "change", "edit"]
        delete_keywords = ["deletar", "remover", "excluir", "apagar", "delete", "remove", "exclua", "apague", "remova", "delete"]
        complete_keywords = ["concluir", "conclua", "finalizar", "finalize", "terminar", "termine", "completar", "complete", "finish", "done", "feito", "terminei", "finalizei", "concluí", "marcar como concluída", "marcar como feita"]
        status_keywords = ["status", "andamento", "progress", "situação", "resumo", "overview", "como está", "como estão", "produtividade"]
        help_keywords = ["ajuda", "help", "como", "how", "comandos", "commands", "o que você faz", "o que faz"]
        
        # Keywords for suggesting next task
        suggest_next_keywords = ["qual", "próxima", "próximo", "deveria", "devo", "começar", "resolver", "focar", "priorizar", "sugerir", "sugira", "recomenda", "recomendar", "por onde"]

        # Priority-based detection (specific intents first)
        
        # Check for "next task" suggestion - HIGH PRIORITY
        # Patterns like: "qual próxima atividade", "o que deveria fazer", "por onde começo"
        suggest_patterns = [
            "qual" in message and ("próxim" in message or "atividade" in message or "tarefa" in message),
            "deveria" in message and ("fazer" in message or "resolver" in message or "começar" in message),
            "devo" in message and ("fazer" in message or "resolver" in message or "começar" in message),
            "por onde" in message and ("começ" in message or "inici" in message),
            "o que" in message and ("fazer agora" in message or "priorizar" in message or "focar" in message),
            "me sugir" in message or "sugira" in message or "recomend" in message,
            "próxima atividade" in message or "próxima tarefa" in message,
            "próximo passo" in message
        ]
        if any(suggest_patterns):
            return "suggest_next_task"

        # Help - highest priority for explicit help requests
        if any(word in message for word in help_keywords):
            if "tarefa" not in message and "task" not in message:
                return "help"

        # Create task - HIGHEST PRIORITY (before time keywords)
        # Check if message starts with create keywords or contains them prominently
        if any(word in message for word in create_keywords):
            return "create_task"

        # Complete task - must have complete keyword
        if any(word in message for word in complete_keywords):
            return "complete_task"

        # Delete task - must have delete keyword
        if any(word in message for word in delete_keywords):
            return "delete_task"

        # Status - check for status queries
        if any(word in message for word in status_keywords):
            if any(word in message for word in task_keywords) or "minha" in message or "meu" in message:
                return "task_status"

        # Update task - must have update keyword AND task reference
        if any(word in message for word in update_keywords):
            if any(word in message for word in task_keywords) or len(message.split()) > 3:
                return "update_task"

        # Check for overdue/late tasks specifically
        overdue_keywords = ["atrasada", "atrasadas", "atrasado", "atrasados", "vencida", "vencidas", "late", "overdue"]
        if any(word in message for word in overdue_keywords):
            return "list_tasks"

        # List tasks - EXPANDED detection for better coverage
        # Direct time references (e.g., "tarefas de hoje", "o que tenho hoje")
        if any(word in message for word in time_keywords):
            return "list_tasks"

        # Status/priority filters (e.g., "tarefas pendentes", "alta prioridade")
        if any(word in message for word in status_filter_keywords + priority_keywords):
            if any(word in message for word in task_keywords) or any(word in message for word in ["minhas", "meus", "tenho", "tem"]):
                return "list_tasks"

        # Explicit list keywords with task keywords
        if any(word in message for word in list_keywords):
                return "list_tasks"

        # Questions about tasks (e.g., "o que tenho pra fazer?")
        if any(word in message for word in ["o que", "what", "quais", "which"]):
            if any(word in message for word in task_keywords + ["fazer", "to do", "pendente", "pending"]):
                return "list_tasks"

        # Default to general for anything else
        return "general"
    
    async def _handle_greeting(self, tasks: List[Task]) -> Dict[str, Any]:
        """Handle greeting messages with a friendly summary"""
        now = now_brazil()
        hour = now.hour
        
        # Determine time-appropriate greeting
        if 5 <= hour < 12:
            greeting = "Bom dia"
        elif 12 <= hour < 18:
            greeting = "Boa tarde"
        else:
            greeting = "Boa noite"
        
        # Quick summary
        pending = [t for t in tasks if t.status.value != "done"]
        overdue = [t for t in pending if t.due_date and to_brazil_tz(t.due_date).date() < now.date()]
        today_tasks = [t for t in pending if t.due_date and to_brazil_tz(t.due_date).date() == now.date()]
        
        summary_parts = []
        if len(overdue) > 0:
            summary_parts.append(f"⚠️ {len(overdue)} atrasada(s)")
        if len(today_tasks) > 0:
            summary_parts.append(f"📅 {len(today_tasks)} para hoje")
        if len(pending) > 0:
            summary_parts.append(f"📋 {len(pending)} pendente(s) no total")
        
        summary = " | ".join(summary_parts) if summary_parts else "✨ Nenhuma tarefa pendente!"
        
        message = f"{greeting}! 👋 Sou seu agente de tarefas.\n\n{summary}\n\nComo posso ajudar? Exemplos:\n• 📋 Listar tarefas\n• ➕ Criar tarefa\n• ✅ Concluir tarefa\n• 📈 Meu progresso"
        
        return {
            "message": message,
            "action": None,
            "data": {"pending": len(pending), "overdue": len(overdue), "today": len(today_tasks)}
        }
    
    def _handle_thanks(self) -> Dict[str, Any]:
        """Handle thank you messages"""
        responses = [
            "😊 Por nada! Estou aqui para ajudar.",
            "👍 Disponha! Qualquer coisa, é só chamar.",
            "✨ Fico feliz em ajudar! Precisa de mais alguma coisa?",
            "🙌 Sempre às ordens! Boa produtividade!"
        ]
        return {
            "message": random.choice(responses),
            "action": None,
            "data": None
        }
    
    async def _handle_suggest_next_task(self, tasks: List[Task]) -> Dict[str, Any]:
        """Suggest the next task the user should work on based on priority and due dates"""
        now = now_brazil()
        today = now.date()
        
        # Filter only pending tasks (not done)
        pending_tasks = [
            t for t in tasks 
            if str(t.status).lower().replace("taskstatus.", "") not in ["done", "concluida", "cancelled", "cancelada"]
        ]
        
        if not pending_tasks:
            return {
                "message": "🎉 Parabéns! Você não tem tarefas pendentes. Todas as suas tarefas foram concluídas!\n\nQue tal criar uma nova tarefa? Basta dizer algo como:\n• \"Criar tarefa reunião com cliente\"",
                "action": None,
                "data": None
            }
        
        # Categorize tasks
        overdue_tasks = []
        urgent_tasks = []
        high_priority_tasks = []
        today_tasks = []
        other_tasks = []
        
        for t in pending_tasks:
            priority = str(t.priority).lower().replace("priority.", "")
            status = str(t.status).lower().replace("taskstatus.", "")
            
            # Check if overdue
            if t.due_date:
                task_date = to_brazil_tz(t.due_date).date()
                if task_date < today:
                    overdue_tasks.append(t)
                    continue
                elif task_date == today:
                    today_tasks.append(t)
                    continue
            
            # Check priority
            if priority in ["urgente", "urgent"]:
                urgent_tasks.append(t)
            elif priority in ["alta", "high"]:
                high_priority_tasks.append(t)
            else:
                other_tasks.append(t)
        
        # Build recommendation based on priority order
        suggested_task = None
        reason = ""
        
        if overdue_tasks:
            # Sort by due date (oldest first) and priority
            overdue_tasks.sort(key=lambda t: (t.due_date, self._priority_order(t.priority)))
            suggested_task = overdue_tasks[0]
            days_overdue = (today - to_brazil_tz(suggested_task.due_date).date()).days
            reason = f"⚠️ Esta tarefa está **atrasada há {days_overdue} dia(s)**. Resolva-a imediatamente para evitar mais atrasos."
        elif urgent_tasks:
            urgent_tasks.sort(key=lambda t: t.due_date if t.due_date else datetime.max.replace(tzinfo=timezone.utc))
            suggested_task = urgent_tasks[0]
            reason = "🚨 Esta tarefa tem **prioridade URGENTE**. Deve ser resolvida o mais rápido possível."
        elif today_tasks:
            today_tasks.sort(key=lambda t: (self._priority_order(t.priority), t.due_date))
            suggested_task = today_tasks[0]
            reason = "📅 Esta tarefa **vence hoje**. Priorize para não atrasar."
        elif high_priority_tasks:
            high_priority_tasks.sort(key=lambda t: t.due_date if t.due_date else datetime.max.replace(tzinfo=timezone.utc))
            suggested_task = high_priority_tasks[0]
            reason = "🔴 Esta tarefa tem **alta prioridade**. É importante resolvê-la logo."
        else:
            # Get oldest pending task or first in list
            other_tasks.sort(key=lambda t: t.created_at if t.created_at else datetime.max.replace(tzinfo=timezone.utc))
            suggested_task = other_tasks[0] if other_tasks else pending_tasks[0]
            reason = "📋 Esta é a próxima tarefa na sua lista. Comece por ela para manter o progresso."
        
        # Format response
        priority_label = self._format_priority(suggested_task.priority)
        status_label = self._format_status(suggested_task.status)
        due_info = ""
        if suggested_task.due_date:
            due_date_br = to_brazil_tz(suggested_task.due_date)
            due_info = f"\n📆 Prazo: {due_date_br.strftime('%d/%m/%Y às %H:%M')}"
        
        message = f"""🎯 **Recomendo que você trabalhe nesta tarefa agora:**

**{suggested_task.title}**
• Status: {status_label}
• Prioridade: {priority_label}{due_info}

{reason}

---
📊 Resumo das suas tarefas pendentes:
• ⚠️ Atrasadas: {len(overdue_tasks)}
• 📅 Para hoje: {len(today_tasks)}
• 🚨 Urgentes: {len(urgent_tasks)}
• 🔴 Alta prioridade: {len(high_priority_tasks)}
• 📋 Outras: {len(other_tasks)}

Quer que eu marque esta tarefa como concluída quando terminar? Basta dizer "concluir {suggested_task.title[:30]}..."."""

        return {
            "message": message,
            "action": "suggest_task",
            "data": {
                "suggested_task": {
                    "id": str(suggested_task.id),
                    "title": suggested_task.title,
                    "priority": str(suggested_task.priority),
                    "status": str(suggested_task.status),
                    "due_date": suggested_task.due_date.isoformat() if suggested_task.due_date else None
                },
                "summary": {
                    "overdue": len(overdue_tasks),
                    "today": len(today_tasks),
                    "urgent": len(urgent_tasks),
                    "high_priority": len(high_priority_tasks),
                    "other": len(other_tasks),
                    "total_pending": len(pending_tasks)
                }
            }
        }
    
    def _priority_order(self, priority) -> int:
        """Return numeric order for priority (lower = higher priority)"""
        p = str(priority).lower().replace("priority.", "")
        order = {
            "urgente": 0, "urgent": 0,
            "alta": 1, "high": 1,
            "media": 2, "medium": 2,
            "baixa": 3, "low": 3
        }
        return order.get(p, 99)
    
    def _format_priority(self, priority) -> str:
        """Format priority for display"""
        p = str(priority).lower().replace("priority.", "")
        labels = {
            "urgente": "🚨 Urgente",
            "urgent": "🚨 Urgente",
            "alta": "🔴 Alta",
            "high": "🔴 Alta",
            "media": "🟡 Média",
            "medium": "🟡 Média",
            "baixa": "🟢 Baixa",
            "low": "🟢 Baixa"
        }
        return labels.get(p, p.capitalize())
    
    def _format_status(self, status) -> str:
        """Format status for display"""
        s = str(status).lower().replace("taskstatus.", "")
        labels = {
            "todo": "📋 A Fazer",
            "pending": "📋 A Fazer",
            "in_progress": "🔄 Em Progresso",
            "done": "✅ Concluída",
            "cancelled": "❌ Cancelada"
        }
        return labels.get(s, s.capitalize())
    
    async def _handle_list_tasks(
        self,
        message: str,
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle request to list tasks"""

        filtered_tasks = tasks

        if "hoje" in message or "today" in message:
            today = now_brazil().date()
            filtered_tasks = [
                t for t in tasks
                if t.due_date and to_brazil_tz(t.due_date).date() == today
            ]
            period = "hoje"
        elif "amanhã" in message or "tomorrow" in message:
            tomorrow = (now_brazil() + timedelta(days=1)).date()
            filtered_tasks = [
                t for t in tasks
                if t.due_date and to_brazil_tz(t.due_date).date() == tomorrow
            ]
            period = "amanhã"
        elif "semana" in message or "week" in message:
            week_end = now_brazil() + timedelta(days=7)
            filtered_tasks = [
                t for t in tasks
                if t.due_date and t.due_date <= week_end
            ]
            period = "esta semana"
        elif "atrasada" in message or "atrasadas" in message or "vencida" in message or "overdue" in message or "late" in message:
            today = now_brazil()
            filtered_tasks = [
                t for t in tasks
                if t.due_date and to_brazil_tz(t.due_date) < today and str(t.status).lower().replace("taskstatus.", "") != "done"
            ]
            period = "atrasadas"
        elif "pendente" in message or "pending" in message or "todo" in message:
            filtered_tasks = [t for t in tasks if str(t.status).lower().replace("taskstatus.", "") in ["pending", "todo"]]
            period = "pendentes"
        elif "progresso" in message or "progress" in message:
            filtered_tasks = [t for t in tasks if str(t.status).lower().replace("taskstatus.", "") == "in_progress"]
            period = "em progresso"
        elif "concluída" in message or "done" in message or "completed" in message:
            filtered_tasks = [t for t in tasks if str(t.status).lower().replace("taskstatus.", "") == "done"]
            period = "concluídas"
        elif "alta" in message or "high" in message or "priorit" in message:
            filtered_tasks = [t for t in tasks if str(t.priority).lower() in ["alta", "high"]]
            period = "de alta prioridade"
        elif "urgente" in message or "urgent" in message:
            filtered_tasks = [t for t in tasks if str(t.priority).lower() in ["urgente", "urgent"]]
            period = "urgentes"
        else:
            # Default: show non-completed tasks
            filtered_tasks = [t for t in tasks if str(t.status).lower().replace("taskstatus.", "") != "done"]
            period = ""
        
        if not filtered_tasks:
            if period:
                return {
                    "message": f"✨ Você não tem tarefas {period}. Ótimo trabalho!",
                    "action": None,
                    "data": None
                }
            else:
                return {
                    "message": "✨ Você não tem tarefas pendentes. Que tal criar uma nova?",
                    "action": None,
                    "data": None
                }

        # Helper function for date formatting
        def format_date(due_date) -> str:
            if not due_date:
                return ""
            now = now_brazil()
            # Converter para timezone do Brasil
            due_date_brazil = to_brazil_tz(due_date)
            date_diff = (due_date_brazil.date() - now.date()).days

            if date_diff < 0:
                return f" [ATRASADA {abs(date_diff)}d]"
            elif date_diff == 0:
                return f" [HOJE {due_date_brazil.strftime('%H:%M')}]"
            elif date_diff == 1:
                return f" [AMANHÃ {due_date_brazil.strftime('%H:%M')}]"
            else:
                return f" [{due_date_brazil.strftime('%d/%m %H:%M')}]"

        def format_status(status: str) -> str:
            return {
                "pending": "PENDENTE",
                "todo": "A FAZER",
                "in_progress": "EM PROGRESSO",
                "done": "CONCLUÍDA",
                "cancelled": "CANCELADA"
            }.get(status, status.upper())

        # Build formatted task list
        task_lines = []
        for idx, t in enumerate(filtered_tasks[:10], 1):
            status = format_status(t.status)
            priority = t.priority.upper()
            date_info = format_date(t.due_date)

            # Truncate title if too long
            title = t.title if len(t.title) <= 60 else t.title[:57] + "..."

            task_line = f"{idx}. {title} | {status} | {priority}{date_info}"
            task_lines.append(task_line)

        task_list = "\n".join(task_lines)

        # Add summary info
        total = len(filtered_tasks)
        showing = min(10, total)
        more_info = f"\n\nMostrando {showing} de {total}" if total > 10 else ""

        return {
            "message": f"Você tem {total} tarefa(s) {period}:\n\n{task_list}{more_info}",
            "action": "list",
            "data": [
                {
                    "id": str(t.id),
                    "title": t.title,
                    "status": t.status,
                    "priority": t.priority,
                    "due_date": t.due_date.isoformat() if t.due_date else None
                }
                for t in filtered_tasks[:10]
            ]
        }
    
    async def _handle_create_task(
        self,
        message: str,
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle request to create a task - returns action for frontend to execute"""

        task_text = message
        message_lower = message.lower()

        # Extrair o texto da tarefa removendo prefixos
        prefixes = ["nova tarefa", "new task", "criar tarefa", "criar", "adicionar tarefa", "adicionar", "create task", "create", "add task", "add"]
        for prefix in prefixes:
            prefix_with_colon = prefix + ":"
            prefix_with_space = prefix + " "

            if message_lower.startswith(prefix_with_colon):
                task_text = message[len(prefix_with_colon):].strip()
                break
            elif message_lower.startswith(prefix_with_space):
                task_text = message[len(prefix_with_space):].strip()
                break

        if not task_text or len(task_text) < 3:
            return {
                "message": "Por favor, descreva a tarefa que você quer criar. Por exemplo:\n\n'Criar reunião com cliente amanhã às 14h'\n'Nova tarefa: revisar código do projeto'",
                "action": None,
                "data": None
            }

        return {
            "message": f"🆕 Vou criar a tarefa:\n\n📌 {task_text}\n\nClique em Confirmar para criar ou Cancelar para desistir.",
            "action": "confirm_create",
            "data": {
                "text": task_text
            },
            "requires_confirmation": True,
            "action_buttons": [
                {"label": "✅ Confirmar", "action": "create", "data": {"text": task_text}},
                {"label": "❌ Cancelar", "action": "cancel", "data": None}
            ]
        }
    
    def _format_status(self, status) -> str:
        """Format task status to Portuguese"""
        status_str = str(status).lower().replace("taskstatus.", "")
        status_map = {
            "todo": "A Fazer",
            "pending": "Pendente", 
            "in_progress": "Em Progresso",
            "done": "Concluída",
            "cancelled": "Cancelada"
        }
        return status_map.get(status_str, status_str)
    
    async def _handle_task_selection(
        self,
        message: str,
        tasks: List[Task],
        action_type: str
    ) -> Dict[str, Any]:
        """Handle numeric selection from a previously shown task list"""
        
        message_stripped = message.strip()
        
        if not message_stripped.isdigit():
            return {
                "message": "Por favor, digite o número da tarefa que deseja selecionar.",
                "action": None,
                "data": None
            }
        
        task_index = int(message_stripped) - 1
        
        # Try to find task from pending list first
        if self.pending_tasks_list and 0 <= task_index < len(self.pending_tasks_list):
            task_data = self.pending_tasks_list[task_index]
            task_id = task_data.get("id")
            task_title = task_data.get("title", "Tarefa")
            
            # Clear context after selection
            self.last_action_context = None
            self.pending_tasks_list = []
            
            if action_type == "complete":
                return {
                    "message": f"✅ Marcar como concluída:\n\n📌 {task_title}\n\nConfirmar?",
                    "action": "confirm_complete",
                    "data": {
                        "task_id": str(task_id),
                        "task_title": task_title
                    },
                    "requires_confirmation": True,
                    "action_buttons": [
                        {"label": "✅ Confirmar", "action": "complete", "data": {"task_id": str(task_id)}},
                        {"label": "❌ Cancelar", "action": "cancel", "data": None}
                    ]
                }
            elif action_type == "delete":
                return {
                    "message": f"🗑️ Excluir tarefa:\n\n📌 {task_title}\n\n⚠️ Esta ação não pode ser desfeita. Confirmar?",
                    "action": "confirm_delete",
                    "data": {
                        "task_id": str(task_id),
                        "task_title": task_title
                    },
                    "requires_confirmation": True,
                    "action_buttons": [
                        {"label": "🗑️ Excluir", "action": "delete", "data": {"task_id": str(task_id)}},
                        {"label": "❌ Cancelar", "action": "cancel", "data": None}
                    ]
                }
        
        # Fallback: try to find from current tasks
        pending_tasks = [t for t in tasks if str(t.status).lower().replace("taskstatus.", "") != "done"]
        
        if 0 <= task_index < len(pending_tasks):
            task = pending_tasks[task_index]
            
            # Clear context
            self.last_action_context = None
            self.pending_tasks_list = []
            
            if action_type == "complete":
                return {
                    "message": f"✅ Marcar como concluída:\n\n📌 {task.title}\n\nConfirmar?",
                    "action": "confirm_complete",
                    "data": {
                        "task_id": str(task.id),
                        "task_title": task.title
                    },
                    "requires_confirmation": True,
                    "action_buttons": [
                        {"label": "✅ Confirmar", "action": "complete", "data": {"task_id": str(task.id)}},
                        {"label": "❌ Cancelar", "action": "cancel", "data": None}
                    ]
                }
            elif action_type == "delete":
                return {
                    "message": f"🗑️ Excluir tarefa:\n\n📌 {task.title}\n\n⚠️ Esta ação não pode ser desfeita. Confirmar?",
                    "action": "confirm_delete",
                    "data": {
                        "task_id": str(task.id),
                        "task_title": task.title
                    },
                    "requires_confirmation": True,
                    "action_buttons": [
                        {"label": "🗑️ Excluir", "action": "delete", "data": {"task_id": str(task.id)}},
                        {"label": "❌ Cancelar", "action": "cancel", "data": None}
                    ]
                }
        
        return {
            "message": f"❌ Número inválido. Por favor, escolha um número válido da lista.",
            "action": None,
            "data": None
        }
    
    async def _handle_complete_task(
        self,
        message: str,
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle request to mark a task as complete"""
        
        # Filtrar apenas tarefas não concluídas
        pending_tasks = [t for t in tasks if str(t.status).lower().replace("taskstatus.", "") != "done"]
        
        if not pending_tasks:
            return {
                "message": "🎉 Parabéns! Você não tem tarefas pendentes para concluir!",
                "action": None,
                "data": None
            }
        
        # Verificar se o usuário digitou um número (seleção de tarefa)
        message_stripped = message.strip()
        if message_stripped.isdigit():
            task_index = int(message_stripped) - 1
            if 0 <= task_index < len(pending_tasks):
                task = pending_tasks[task_index]
                return {
                    "message": f"✅ Marcar como concluída:\n\n📌 {task.title}\n\nConfirmar?",
                    "action": "confirm_complete",
                    "data": {
                        "task_id": str(task.id),
                        "task_title": task.title
                    },
                    "requires_confirmation": True,
                    "action_buttons": [
                        {"label": "✅ Confirmar", "action": "complete", "data": {"task_id": str(task.id)}},
                        {"label": "❌ Cancelar", "action": "cancel", "data": None}
                    ]
                }
        
        # Extrair palavras-chave da mensagem
        task_keywords = []
        exclude_words = ["concluir", "finalizar", "terminar", "completar", "complete", "finish", "done", "feito", "terminei", "tarefa", "tarefas", "marcar", "como", "concluída", "feita"]
        for word in message.split():
            if len(word) > 2 and word not in exclude_words:
                task_keywords.append(word)
        
        matching_tasks = []
        if task_keywords:
            for task in pending_tasks:
                if any(keyword in task.title.lower() for keyword in task_keywords):
                    matching_tasks.append(task)
        
        if not task_keywords or not matching_tasks:
            # Listar tarefas pendentes para o usuário escolher
            task_list = "\n".join([f"{i+1}. {t.title} ({self._format_status(t.status)})" for i, t in enumerate(pending_tasks[:8])])
            return {
                "message": f"✅ Qual tarefa você quer marcar como concluída?\n\n{task_list}\n\nDigite o nome ou número da tarefa.",
                "action": "select_complete",
                "data": [{"id": str(t.id), "title": t.title, "status": self._format_status(t.status)} for t in pending_tasks[:8]]
            }
        
        if len(matching_tasks) == 1:
            task = matching_tasks[0]
            return {
                "message": f"✅ Marcar como concluída:\n\n📌 {task.title}\n\nConfirmar?",
                "action": "confirm_complete",
                "data": {
                    "task_id": str(task.id),
                    "task_title": task.title
                },
                "requires_confirmation": True,
                "action_buttons": [
                    {"label": "✅ Confirmar", "action": "complete", "data": {"task_id": str(task.id)}},
                    {"label": "❌ Cancelar", "action": "cancel", "data": None}
                ]
            }
        else:
            task_list = "\n".join([f"{i+1}. {t.title}" for i, t in enumerate(matching_tasks[:5])])
            return {
                "message": f"Encontrei {len(matching_tasks)} tarefas:\n\n{task_list}\n\nQual você quer marcar como concluída?",
                "action": "select_complete",
                "data": [
                    {"id": str(t.id), "title": t.title}
                    for t in matching_tasks[:5]
                ]
            }
    
    async def _handle_update_task(
        self, 
        message: str, 
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle request to update a task"""
        
        task_keywords = []
        for word in message.split():
            if len(word) > 3 and word not in ["atualizar", "modificar", "mudar", "update", "modify", "change", "para", "para"]:
                task_keywords.append(word)
        
        if not task_keywords:
            return {
                "message": "Qual tarefa você quer atualizar? Por favor, seja mais específico.",
                "action": None,
                "data": None
            }
        
        matching_tasks = []
        for task in tasks:
            if any(keyword in task.title.lower() for keyword in task_keywords):
                matching_tasks.append(task)
        
        if not matching_tasks:
            return {
                "message": f"Não encontrei nenhuma tarefa com '{' '.join(task_keywords[:3])}'.",
                "action": None,
                "data": None
            }
        
        if len(matching_tasks) == 1:
            task = matching_tasks[0]
            return {
                "message": f"Encontrei a tarefa '{task.title}'. O que você quer atualizar?",
                "action": "update",
                "data": {
                    "task_id": str(task.id),
                    "task_title": task.title
                }
            }
        else:
            task_list = "\n".join([f"• {t.title}" for t in matching_tasks[:5]])
            return {
                "message": f"Encontrei {len(matching_tasks)} tarefas:\n\n{task_list}\n\nQual delas você quer atualizar?",
                "action": "select",
                "data": [
                    {"id": str(t.id), "title": t.title}
                    for t in matching_tasks[:5]
                ]
            }
    
    async def _handle_delete_task(
        self, 
        message: str, 
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle request to delete a task"""
        
        task_keywords = []
        for word in message.split():
            if len(word) > 3 and word not in ["deletar", "remover", "excluir", "delete", "remove", "apagar"]:
                task_keywords.append(word)
        
        if not task_keywords:
            # Listar tarefas para o usuário escolher
            if tasks:
                task_list = "\n".join([f"{i+1}. {t.title}" for i, t in enumerate(tasks[:8])])
                return {
                    "message": f"Qual tarefa você quer deletar?\n\n{task_list}\n\nDigite o nome ou número da tarefa.",
                    "action": "select_delete",
                    "data": [{"id": str(t.id), "title": t.title} for t in tasks[:8]]
                }
            return {
                "message": "Você não tem tarefas para deletar.",
                "action": None,
                "data": None
            }
        
        matching_tasks = []
        for task in tasks:
            if any(keyword in task.title.lower() for keyword in task_keywords):
                matching_tasks.append(task)
        
        if not matching_tasks:
            return {
                "message": f"Não encontrei nenhuma tarefa com '{' '.join(task_keywords[:3])}'. Tente ser mais específico.",
                "action": None,
                "data": None
            }
        
        if len(matching_tasks) == 1:
            task = matching_tasks[0]
            return {
                "message": f"🗑️ Tem certeza que quer deletar a tarefa:\n\n📌 {task.title}\n\n⚠️ Essa ação não pode ser desfeita.",
                "action": "confirm_delete",
                "data": {
                    "task_id": str(task.id),
                    "task_title": task.title
                },
                "requires_confirmation": True,
                "action_buttons": [
                    {"label": "🗑️ Sim, deletar", "action": "delete", "data": {"task_id": str(task.id)}},
                    {"label": "❌ Cancelar", "action": "cancel", "data": None}
                ]
            }
        else:
            task_list = "\n".join([f"{i+1}. {t.title}" for i, t in enumerate(matching_tasks[:5])])
            return {
                "message": f"Encontrei {len(matching_tasks)} tarefas:\n\n{task_list}\n\nQual delas você quer deletar? Digite o número.",
                "action": "select_delete",
                "data": [
                    {"id": str(t.id), "title": t.title}
                    for t in matching_tasks[:5]
                ]
            }
    
    async def _handle_task_status(
        self, 
        message: str, 
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle request for task status summary with insights"""
        
        total = len(tasks)
        
        # Count by status (handle enum properly)
        pending = len([t for t in tasks if str(t.status).lower().replace("taskstatus.", "") == "pending"])
        todo = len([t for t in tasks if str(t.status).lower().replace("taskstatus.", "") == "todo"])
        in_progress = len([t for t in tasks if str(t.status).lower().replace("taskstatus.", "") == "in_progress"])
        done = len([t for t in tasks if str(t.status).lower().replace("taskstatus.", "") == "done"])
        
        active_tasks = pending + todo + in_progress
        completion_rate = (done / total * 100) if total > 0 else 0
        
        # Count overdue tasks
        now = now_brazil()
        overdue = len([
            t for t in tasks 
            if t.due_date and to_brazil_tz(t.due_date) < now and str(t.status).lower().replace("taskstatus.", "") != "done"
        ])
        
        # Count high priority pending
        high_priority = len([
            t for t in tasks 
            if str(t.priority).lower() in ["alta", "high", "urgente", "urgent"] 
            and str(t.status).lower().replace("taskstatus.", "") != "done"
        ])
        
        # Count tasks due today
        today = now.date()
        due_today = len([
            t for t in tasks 
            if t.due_date and to_brazil_tz(t.due_date).date() == today 
            and str(t.status).lower().replace("taskstatus.", "") != "done"
        ])
        
        # Build status message with insights
        status_lines = [
            f"📊 Resumo das suas tarefas:",
            f"",
            f"📈 Total: {total} tarefas",
            f"✅ Concluídas: {done} ({completion_rate:.0f}%)",
            f"🔄 Em progresso: {in_progress}",
            f"📋 Pendentes: {pending + todo}",
        ]
        
        # Add alerts
        alerts = []
        if overdue > 0:
            alerts.append(f"🚨 {overdue} tarefa(s) atrasada(s)!")
        if due_today > 0:
            alerts.append(f"⏰ {due_today} tarefa(s) para hoje")
        if high_priority > 0:
            alerts.append(f"⚡ {high_priority} de alta prioridade")
        
        if alerts:
            status_lines.append("")
            status_lines.extend(alerts)
        
        # Add motivational message
        if completion_rate >= 80:
            status_lines.append("\n🌟 Excelente! Você está quase lá!")
        elif completion_rate >= 50:
            status_lines.append("\n💪 Bom progresso! Continue assim!")
        elif active_tasks == 0 and done > 0:
            status_lines.append("\n🎉 Parabéns! Todas as tarefas concluídas!")
        
        message_text = "\n".join(status_lines)
        
        return {
            "message": message_text,
            "action": "status",
            "data": {
                "total": total,
                "pending": pending + todo,
                "in_progress": in_progress,
                "done": done,
                "completion_rate": completion_rate,
                "overdue": overdue,
                "due_today": due_today,
                "high_priority_pending": high_priority
            }
        }
    
    def _handle_help(self) -> Dict[str, Any]:
        """Handle help request"""

        help_text = """🤖 Comandos do Agente de IA

📋 LISTAR:
• Minhas tarefas / Tarefas de hoje
• Tarefas atrasadas / Tarefas pendentes

➕ CRIAR:
• Criar [descrição da tarefa]
• Ex: Criar reunião amanhã às 14h

✅ CONCLUIR:
• Concluir [nome da tarefa]
• Ou digite o número após listar

🗑️ DELETAR:
• Deletar [nome da tarefa]

📊 STATUS:
• Meu progresso / Status

💡 Dica: Fale naturalmente! Eu entendo o contexto."""

        return {
            "message": help_text,
            "action": "help",
            "data": None
        }
    
    async def _handle_general_query(
        self, 
        message: str, 
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle general queries using GPT-4"""
        return await self._handle_with_gpt(message, tasks)
    
    async def _handle_with_gpt(
        self,
        message: str,
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle query using GPT-4 with improved prompting and context"""

        # Get current date for temporal context (using Brazil timezone)
        now = now_brazil()
        today = now.date()
        tomorrow = (now + timedelta(days=1)).date()

        # Build concise task context with temporal annotations (no descriptions to save tokens)
        task_lines = []
        for t in tasks[:30]:
            # Add temporal context
            temporal_tag = ""
            if t.due_date:
                task_date = to_brazil_tz(t.due_date).date()
                if task_date < today:
                    temporal_tag = " [ATRASADA]"
                elif task_date == today:
                    temporal_tag = " [HOJE]"
                elif task_date == tomorrow:
                    temporal_tag = " [AMANHÃ]"

            task_line = f"- {t.title} | Status: {t.status} | Prioridade: {t.priority}"
            if t.due_date:
                task_line += f" | Prazo: {t.due_date.strftime('%d/%m/%Y %H:%M')}{temporal_tag}"

            task_lines.append(task_line)

        task_summary = "\n".join(task_lines)

        # Build conversation history for context
        recent_history = ""
        if len(self.conversation_history) > 1:
            recent_messages = self.conversation_history[-6:]  # Last 3 exchanges
            recent_history = "\n".join([
                f"{msg['role'].upper()}: {msg['content'][:200]}"
                for msg in recent_messages
            ])

        # Comprehensive system prompt with clear boundaries
        system_prompt = """Você é um assistente especializado em gerenciamento de tarefas. Suas responsabilidades são LIMITADAS a:

1. Responder perguntas sobre as tarefas do usuário com base nos dados fornecidos
2. Fornecer insights sobre produtividade e organização de tarefas
3. Sugerir prioridades baseadas nas tarefas existentes
4. Ajudar a entender status e progresso das tarefas

REGRAS CRÍTICAS:
- SEMPRE use os dados REAIS das tarefas fornecidas - liste tarefas específicas com títulos, status e prazos
- NUNCA invente ou sugira tarefas que não existem na lista fornecida
- Quando perguntarem sobre tarefas (hoje, amanhã, pendentes, etc.), LISTE as tarefas reais com detalhes
- Se não houver tarefas para o período/filtro solicitado, informe claramente
- Seja específico e factual - cite títulos e detalhes das tarefas
- Seja conciso mas completo (máximo 5-6 linhas)
- Responda SEMPRE em português brasileiro
- NÃO use emojis
- NÃO responda perguntas não relacionadas a tarefas ou produtividade

EXEMPLOS DE RESPOSTAS CORRETAS:

Pergunta: "O que tenho para hoje?"
Resposta: "Você tem 2 tarefas para hoje:
- Reunião com cliente (Status: todo, Prioridade: high)
- Revisar código (Status: in_progress, Prioridade: medium)"

Pergunta: "Quais são minhas tarefas urgentes?"
Resposta: "Você tem 1 tarefa urgente:
- Corrigir bug em produção (Status: todo, Prazo: hoje às 18h)"

Se perguntarem algo fora do escopo, responda: "Só posso ajudar com questões relacionadas às suas tarefas. Digite 'ajuda' para ver os comandos."
"""

        # Add current date/time context for better filtering (using Brazil timezone)
        current_datetime = now_brazil()
        today_str = current_datetime.strftime("%d/%m/%Y")
        time_str = current_datetime.strftime("%H:%M")

        # Build history section separately to avoid f-string backslash issues
        history_section = ""
        if recent_history:
            history_section = f"\nHISTÓRICO DA CONVERSA:\n{recent_history}\n"

        user_prompt = f"""DATA E HORA ATUAL: {today_str} {time_str}

TAREFAS DO USUÁRIO (lista completa com todos os detalhes):
{task_summary if task_summary else "Nenhuma tarefa cadastrada"}
{history_section}
PERGUNTA DO USUÁRIO: {message}

INSTRUÇÕES:
1. Analise a pergunta e identifique se o usuário quer listar/filtrar tarefas
2. Se sim, filtre as tarefas acima baseado no critério (hoje, amanhã, pendente, alta prioridade, etc.)
3. Liste APENAS as tarefas REAIS que correspondem ao filtro, com seus detalhes (ID, título, status, prazo)
4. Se não houver tarefas para o filtro, diga claramente que não há nenhuma
5. Seja específico e use dados reais - cite títulos, IDs e detalhes das tarefas listadas acima

Responda agora de forma útil e factual:"""

        try:
            logger.info(
                "Calling GPT for chat response",
                extra={
                    "tasks_count": len(tasks),
                    "has_history": bool(recent_history),
                    "prompt_length": len(user_prompt)
                }
            )

            # Use structured message format with system prompt
            result = await self.openai_adapter.generate_completion(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.4,  # Balanced temperature for consistent but natural responses
                max_tokens=800    # Increased for better responses
            )

            response_content = result.get("content", "").strip()

            logger.info(
                "GPT response received",
                extra={
                    "response_length": len(response_content),
                    "tokens_used": result.get("tokens_used", 0),
                    "cost": result.get("cost", 0)
                }
            )

            # Validate response is not empty and not too long
            if not response_content:
                return {
                    "message": "Desculpe, não consegui gerar uma resposta adequada. Digite 'ajuda' para ver os comandos disponíveis.",
                    "action": None,
                    "data": None
                }

            # Limit response length to avoid overwhelming user
            if len(response_content) > 1000:
                response_content = response_content[:1000] + "..."

            return {
                "message": response_content,
                "action": "general",
                "data": None
            }
        except Exception as e:
            logger.error(f"GPT chat failed: {e}")
            return {
                "message": "Desculpe, não entendi. Digite 'ajuda' para ver os comandos disponíveis.",
                "action": None,
                "data": None
            }
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get conversation history"""
        return self.conversation_history
