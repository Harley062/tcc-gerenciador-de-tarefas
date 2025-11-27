"""
Chat Assistant Service - AI Agent for autonomous task management
"""
import logging
import random
import re
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
    - Remember conversation context for smart follow-ups
    """

    MAX_HISTORY_SIZE = 30  # Maximum number of messages to keep in history
    
    # Quick intent cache for common phrases (avoids GPT calls)
    QUICK_INTENT_MAP = {
        # Greetings
        "oi": "greeting", "olá": "greeting", "ola": "greeting", "hey": "greeting",
        "bom dia": "greeting", "boa tarde": "greeting", "boa noite": "greeting",
        "e aí": "greeting", "eai": "greeting", "oi!": "greeting", "olá!": "greeting",
        
        # Thanks
        "obrigado": "thanks", "obrigada": "thanks", "valeu": "thanks", "vlw": "thanks",
        "brigado": "thanks", "thanks": "thanks", "obrigado!": "thanks",
        
        # Help
        "ajuda": "help", "help": "help", "comandos": "help", "?": "help",
        "o que você faz": "about_system", "o que voce faz": "about_system",
        
        # Confirmations
        "sim": "confirm_yes", "s": "confirm_yes", "ok": "confirm_yes", 
        "confirmar": "confirm_yes", "pode ser": "confirm_yes", "isso": "confirm_yes",
        "sim!": "confirm_yes", "confirma": "confirm_yes", "pode": "confirm_yes",
        
        # Negations
        "não": "confirm_no", "nao": "confirm_no", "n": "confirm_no",
        "cancelar": "confirm_no", "cancela": "confirm_no", "desistir": "confirm_no",
        "não quero": "confirm_no", "deixa pra lá": "confirm_no",
        
        # Quick actions
        "minhas tarefas": "list_tasks", "listar tarefas": "list_tasks",
        "tarefas de hoje": "list_tasks", "tarefas para hoje": "list_tasks",
        "criar tarefa": "create_task", "nova tarefa": "create_task",
        "meu progresso": "task_status", "meu status": "task_status",
    }

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
        self.awaiting_confirmation = None  # Store pending confirmation data
        self.conversation_context = None  # Current conversation topic/context
    
    def set_repository(self, repository, user_id: UUID):
        """Set the task repository for direct execution"""
        self.task_repository = repository
        self.user_id = user_id
    
    def _is_waiting_for_task_description(self) -> bool:
        """Check if the last assistant message was asking for task description"""
        if not self.conversation_history:
            return False
        
        # Find the last assistant message
        for msg in reversed(self.conversation_history):
            if msg.get("role") == "assistant":
                content = msg.get("content", "").lower()
                # Check if the message was asking for task description
                waiting_phrases = [
                    "descreva a tarefa",
                    "qual tarefa",
                    "que tarefa você quer criar",
                    "por favor, descreva",
                    "me diga qual tarefa",
                    "qual seria a tarefa"
                ]
                return any(phrase in content for phrase in waiting_phrases)
        
        return False
    
    def _get_conversation_context(self) -> Optional[str]:
        """Analyze recent conversation to understand context"""
        if not self.conversation_history:
            return None
        
        # Check last few messages for context
        recent = self.conversation_history[-4:] if len(self.conversation_history) >= 4 else self.conversation_history
        
        for msg in reversed(recent):
            if msg.get("role") == "assistant":
                content = msg.get("content", "").lower()
                
                # Detect various contexts
                if "vou criar a tarefa" in content or "confirmar para criar" in content:
                    return "awaiting_create_confirmation"
                elif "marcar como concluída" in content or "confirmar" in content and "concluí" in content:
                    return "awaiting_complete_confirmation"
                elif "excluir tarefa" in content or "deletar" in content:
                    return "awaiting_delete_confirmation"
                elif "descreva a tarefa" in content or "qual tarefa você quer" in content:
                    return "awaiting_task_description"
                elif "digite o número" in content or "qual delas" in content:
                    return "awaiting_selection"
        
        return None
    
    def _quick_intent_check(self, message: str) -> Optional[str]:
        """Check for quick intent matches without calling GPT"""
        message_lower = message.lower().strip()
        
        # Direct match
        if message_lower in self.QUICK_INTENT_MAP:
            return self.QUICK_INTENT_MAP[message_lower]
        
        # Check for number (selection)
        if message_lower.isdigit() and self.last_action_context:
            return f"select_{self.last_action_context}"
        
        # Check for patterns
        if message_lower.startswith("criar ") or message_lower.startswith("adicionar "):
            return "create_task"
        if message_lower.startswith("concluir ") or message_lower.startswith("finalizar "):
            return "complete_task"
        if message_lower.startswith("deletar ") or message_lower.startswith("excluir ") or message_lower.startswith("remover "):
            return "delete_task"
        
        return None

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

            message_lower = message.lower().strip()
            
            # Step 1: Check conversation context first
            conv_context = self._get_conversation_context()
            
            # Step 2: Quick intent check (no GPT call needed)
            quick_intent = self._quick_intent_check(message_lower)
            
            # Step 3: Handle based on context and intent
            intent = None
            
            # Handle confirmations based on context
            if quick_intent == "confirm_yes" and conv_context:
                if conv_context == "awaiting_create_confirmation":
                    # User confirmed task creation - but frontend handles this
                    intent = "confirm_yes"
                elif conv_context == "awaiting_complete_confirmation":
                    intent = "confirm_yes"
                elif conv_context == "awaiting_delete_confirmation":
                    intent = "confirm_yes"
            elif quick_intent == "confirm_no" and conv_context:
                intent = "confirm_no"
            
            # Handle task description after being asked
            elif conv_context == "awaiting_task_description" and not quick_intent:
                logger.info("Context: waiting for task description, treating as create_task")
                intent = "create_task"
            
            # Handle selection after being asked
            elif conv_context == "awaiting_selection" and message_lower.isdigit():
                if self.last_action_context:
                    intent = f"select_{self.last_action_context}"
            
            # Use quick intent if found
            elif quick_intent and quick_intent not in ["confirm_yes", "confirm_no"]:
                intent = quick_intent
            
            # Fall back to GPT classification
            if not intent:
                intent = await self._detect_intent(message_lower)

            self.conversation_history.append({
                "role": "user",
                "content": message,
                "timestamp": now_brazil().isoformat()
            })

            logger.info(
                "Intent detected",
                extra={"intent": intent, "context": conv_context, "message_preview": message[:50]}
            )

            # Route to appropriate handler
            if intent == "confirm_yes":
                response = self._handle_confirmation_yes()
            elif intent == "confirm_no":
                response = self._handle_confirmation_no()
            elif intent == "greeting":
                response = await self._handle_greeting(user_tasks)
            elif intent == "thanks":
                response = self._handle_thanks()
            elif intent == "about_system":
                response = self._handle_about_system(user_tasks)
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
    
    async def _detect_intent_with_gpt(self, message: str) -> str:
        """Use GPT to intelligently classify user intent with conversation context"""
        
        # Build context from recent conversation
        recent_context = ""
        if self.conversation_history:
            recent = self.conversation_history[-4:]
            context_lines = []
            for msg in recent:
                role = "Usuário" if msg.get("role") == "user" else "Assistente"
                content = msg.get("content", "")[:100]
                context_lines.append(f"{role}: {content}")
            if context_lines:
                recent_context = "\n".join(context_lines)
        
        system_prompt = """Você é um classificador de intenções para um sistema de gerenciamento de tarefas.

Analise a mensagem do usuário CONSIDERANDO O CONTEXTO DA CONVERSA e retorne APENAS UMA das seguintes intenções:

INTENÇÕES DISPONÍVEIS:
- greeting: Saudações como "oi", "olá", "bom dia", "boa tarde"
- thanks: Agradecimentos como "obrigado", "valeu", "thanks"
- about_system: Perguntas sobre o sistema, como funciona, o que faz, funcionalidades
- help: Pedidos de ajuda ou comandos disponíveis
- list_tasks: Listar, ver, mostrar tarefas (hoje, pendentes, atrasadas, etc.)
- create_task: Criar/adicionar tarefa OU descrever uma tarefa para criar (título, descrição, horário)
- complete_task: Concluir, finalizar, terminar uma tarefa
- delete_task: Deletar, remover, excluir uma tarefa
- update_task: Atualizar, modificar, editar uma tarefa
- suggest_next_task: Perguntar qual tarefa fazer agora, por onde começar, priorização
- task_status: Ver progresso, status geral, produtividade, resumo
- general: Qualquer outra coisa que não se encaixe acima

REGRAS IMPORTANTES:
1. Se a ÚLTIMA mensagem do assistente PEDIU para descrever uma tarefa, e o usuário responde com algo que parece uma tarefa (ex: "reunião com cliente às 14h") → create_task
2. Se o usuário menciona horário, data ou atividade que parece uma tarefa → provavelmente create_task
3. Se o usuário quer saber SOBRE o sistema/app/assistente em si → about_system
4. Se o usuário quer ver/listar SUAS tarefas existentes → list_tasks
5. Se pergunta "o que fazer agora" ou quer recomendação → suggest_next_task

Responda APENAS com a intenção, nada mais."""

        # Build user prompt with context
        context_section = ""
        if recent_context:
            context_section = f"\nCONTEXTO DA CONVERSA RECENTE:\n{recent_context}\n"
        
        user_prompt = f"{context_section}MENSAGEM ATUAL DO USUÁRIO: \"{message}\"\n\nIntenção:"

        try:
            result = await self.openai_adapter.generate_completion(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.1,  # Baixa temperatura para consistência
                max_tokens=20
            )
            
            intent = result.get("content", "").strip().lower()
            
            # Validate intent is one of the expected values
            valid_intents = [
                "greeting", "thanks", "about_system", "help", "list_tasks",
                "create_task", "complete_task", "delete_task", "update_task",
                "suggest_next_task", "task_status", "general"
            ]
            
            if intent in valid_intents:
                logger.info(f"GPT classified intent as: {intent}")
                return intent
            else:
                # If GPT returns something unexpected, default to general
                logger.warning(f"GPT returned unexpected intent: {intent}, defaulting to general")
                return "general"
                
        except Exception as e:
            logger.error(f"GPT intent classification failed: {e}")
            # Fallback to basic detection if GPT fails
            return self._detect_intent_fallback(message)
    
    def _detect_intent_fallback(self, message: str) -> str:
        """Fallback intent detection using keywords (used when GPT fails)"""
        message_lower = message.lower()
        
        # Simple keyword-based fallback
        if any(g in message_lower for g in ["oi", "olá", "bom dia", "boa tarde", "boa noite"]):
            return "greeting"
        if any(t in message_lower for t in ["obrigado", "valeu", "thanks"]):
            return "thanks"
        if any(h in message_lower for h in ["ajuda", "help", "comandos"]):
            return "help"
        if any(c in message_lower for c in ["criar", "adicionar", "nova tarefa"]):
            return "create_task"
        if any(c in message_lower for c in ["concluir", "finalizar", "terminar"]):
            return "complete_task"
        if any(d in message_lower for d in ["deletar", "remover", "excluir"]):
            return "delete_task"
        if any(l in message_lower for l in ["listar", "minhas tarefas", "tarefas de hoje"]):
            return "list_tasks"
            
        return "general"
    
    async def _detect_intent(self, message: str) -> str:
        """Detect user intent - uses GPT for intelligent classification"""

        # Check if user is responding with a number (selection from previous list)
        message_stripped = message.strip()
        if message_stripped.isdigit() and self.last_action_context:
            # User is selecting from a list
            return f"select_{self.last_action_context}"
        
        # Use GPT for intelligent intent classification
        return await self._detect_intent_with_gpt(message)
    
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
    
    def _handle_confirmation_yes(self) -> Dict[str, Any]:
        """Handle when user confirms with 'sim', 'ok', etc."""
        # The actual confirmation is handled by the frontend buttons
        # This is for when user types confirmation instead of clicking
        return {
            "message": "👍 Entendido! Use os botões de confirmação acima para confirmar a ação, ou me diga o que mais posso ajudar.",
            "action": None,
            "data": None
        }
    
    def _handle_confirmation_no(self) -> Dict[str, Any]:
        """Handle when user cancels with 'não', 'cancelar', etc."""
        # Clear any pending context
        self.awaiting_confirmation = None
        self.last_action_context = None
        self.pending_tasks_list = []
        
        responses = [
            "👌 Tudo bem, ação cancelada! O que mais posso fazer por você?",
            "✅ Cancelado! Estou aqui se precisar de algo.",
            "Ok, sem problemas! Como posso ajudar?"
        ]
        return {
            "message": random.choice(responses),
            "action": "cancelled",
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
            reason = f"⚠️ Esta tarefa está atrasada há {days_overdue} dia(s). Resolva-a imediatamente para evitar mais atrasos."
        elif urgent_tasks:
            urgent_tasks.sort(key=lambda t: t.due_date if t.due_date else datetime.max.replace(tzinfo=timezone.utc))
            suggested_task = urgent_tasks[0]
            reason = "🚨 Esta tarefa tem prioridade URGENTE. Deve ser resolvida o mais rápido possível."
        elif today_tasks:
            today_tasks.sort(key=lambda t: (self._priority_order(t.priority), t.due_date))
            suggested_task = today_tasks[0]
            reason = "📅 Esta tarefa vence hoje. Priorize para não atrasar."
        elif high_priority_tasks:
            high_priority_tasks.sort(key=lambda t: t.due_date if t.due_date else datetime.max.replace(tzinfo=timezone.utc))
            suggested_task = high_priority_tasks[0]
            reason = "🔴 Esta tarefa tem alta prioridade. É importante resolvê-la logo."
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
        
        message = f"""🎯 Recomendo que você trabalhe nesta tarefa agora:

{suggested_task.title}
• Status: {status_label}
• Prioridade: {priority_label}{due_info}

{reason}

📊 Resumo das suas tarefas pendentes:
• Atrasadas: {len(overdue_tasks)}
• Para hoje: {len(today_tasks)}
• Urgentes: {len(urgent_tasks)}
• Alta prioridade: {len(high_priority_tasks)}
• Outras: {len(other_tasks)}

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
        """Format status for display with emoji"""
        s = str(status).lower().replace("taskstatus.", "")
        labels = {
            "todo": "📋 A Fazer",
            "pending": "📋 A Fazer",
            "in_progress": "🔄 Em Progresso",
            "done": "✅ Concluída",
            "cancelled": "❌ Cancelada"
        }
        return labels.get(s, s.capitalize())
    
    def _format_priority_text(self, priority) -> str:
        """Format priority to Portuguese text without emoji"""
        p = str(priority).lower().replace("priority.", "")
        labels = {
            "urgente": "Urgente",
            "urgent": "Urgente",
            "alta": "Alta",
            "high": "Alta",
            "media": "Média",
            "medium": "Média",
            "baixa": "Baixa",
            "low": "Baixa"
        }
        return labels.get(p, p.capitalize())
    
    def _format_status_text(self, status) -> str:
        """Format status to Portuguese text without emoji"""
        s = str(status).lower().replace("taskstatus.", "")
        labels = {
            "todo": "A Fazer",
            "pending": "A Fazer",
            "in_progress": "Em Progresso",
            "done": "Concluída",
            "cancelled": "Cancelada"
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
        
        def format_priority(priority):
            """Format priority to Portuguese"""
            p = str(priority).lower().replace("priority.", "")
            return {
                "urgente": "URGENTE",
                "urgent": "URGENTE",
                "alta": "ALTA",
                "high": "ALTA",
                "media": "MÉDIA",
                "medium": "MÉDIA",
                "baixa": "BAIXA",
                "low": "BAIXA"
            }.get(p, p.upper())

        # Build formatted task list
        task_lines = []
        for idx, t in enumerate(filtered_tasks[:10], 1):
            status = format_status(t.status)
            priority = format_priority(t.priority)
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
        """Handle request to create a task - uses GPT to extract task details"""

        # Use GPT to extract task title and date intelligently
        task_info = await self._extract_task_info_with_gpt(message)
        
        task_title = task_info.get("title", "").strip()
        due_date = task_info.get("due_date")
        priority = task_info.get("priority", "medium")
        
        if not task_title or len(task_title) < 3:
            return {
                "message": "Por favor, descreva a tarefa que você quer criar. Por exemplo:\n\n'Criar reunião com cliente amanhã às 14h'\n'Nova tarefa: revisar código do projeto'",
                "action": None,
                "data": None
            }

        # Build confirmation message
        confirm_msg = f"🆕 Vou criar a tarefa:\n\n📌 {task_title}"
        
        if due_date:
            confirm_msg += f"\n📅 Data: {due_date}"
        
        priority_labels = {"high": "Alta", "medium": "Média", "low": "Baixa", "urgent": "Urgente"}
        priority_label = priority_labels.get(priority, "Média")
        confirm_msg += f"\n🎯 Prioridade: {priority_label}"
        
        confirm_msg += "\n\nClique em Confirmar para criar ou Cancelar para desistir."

        return {
            "message": confirm_msg,
            "action": "confirm_create",
            "data": {
                "title": task_title,
                "text": task_title,  # Keep for compatibility
                "due_date": due_date,
                "priority": priority
            },
            "requires_confirmation": True,
            "action_buttons": [
                {"label": "✅ Confirmar", "action": "create", "data": {"title": task_title, "text": task_title, "due_date": due_date, "priority": priority}},
                {"label": "❌ Cancelar", "action": "cancel", "data": None}
            ]
        }
    
    async def _extract_task_info_with_gpt(self, message: str) -> Dict[str, Any]:
        """Use GPT to intelligently extract task title, date, and priority from user message"""
        
        now = now_brazil()
        today_str = now.strftime("%Y-%m-%d")
        tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        
        system_prompt = f"""Você é um extrator de informações de tarefas. Analise a mensagem do usuário e extraia:

1. TÍTULO: O nome/descrição da tarefa (limpo, sem palavras como "criar", "amanhã", "para")
2. DATA: Se mencionou quando (hoje, amanhã, próxima semana, data específica)
3. PRIORIDADE: Se mencionou urgência (alta, média, baixa, urgente)

REGRAS:
- Hoje é {today_str}
- Amanhã é {tomorrow_str}
- O título deve ser APENAS a descrição da tarefa, sem datas ou comandos
- Remova palavras como "criar", "tarefa", "para", "amanhã", "hoje" do título
- O título deve fazer sentido sozinho (ex: "Reunião com a diretoria", não "para amanhã ter uma reunião")

RESPONDA APENAS em formato JSON válido:
{{"title": "título limpo da tarefa", "due_date": "YYYY-MM-DD HH:MM ou null", "priority": "high/medium/low/urgent"}}

EXEMPLOS:
Entrada: "criar tarefa para amanhã ter uma reunião com a diretoria"
Saída: {{"title": "Reunião com a diretoria", "due_date": "{tomorrow_str}", "priority": "medium"}}

Entrada: "adicionar revisar código do projeto urgente"
Saída: {{"title": "Revisar código do projeto", "due_date": null, "priority": "urgent"}}

Entrada: "nova tarefa: ligar para o cliente às 15h"
Saída: {{"title": "Ligar para o cliente", "due_date": "{today_str} 15:00", "priority": "medium"}}"""

        user_prompt = f"Mensagem do usuário: \"{message}\"\n\nExtraia as informações em JSON:"

        try:
            result = await self.openai_adapter.generate_completion(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=150
            )
            
            response_text = result.get("content", "").strip()
            
            # Try to parse JSON from response
            import json
            
            # Clean up response if needed
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            task_info = json.loads(response_text)
            
            logger.info(f"GPT extracted task info: {task_info}")
            return task_info
            
        except Exception as e:
            logger.error(f"Failed to extract task info with GPT: {e}")
            # Fallback: use original message as title with basic cleanup
            task_text = message.lower()
            prefixes = ["nova tarefa", "criar tarefa", "criar", "adicionar tarefa", "adicionar", "agendar", "marcar"]
            for prefix in prefixes:
                if task_text.startswith(prefix + ":"):
                    task_text = message[len(prefix) + 1:].strip()
                    break
                elif task_text.startswith(prefix + " "):
                    task_text = message[len(prefix) + 1:].strip()
                    break
            
            return {"title": task_text, "due_date": None, "priority": "medium"}
    
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
    
    def _handle_about_system(self, tasks: List[Task]) -> Dict[str, Any]:
        """Handle questions about the system itself"""
        
        # Build a personalized explanation based on user's tasks
        total_tasks = len(tasks)
        pending = sum(1 for t in tasks if t.status.value == "todo")
        in_progress = sum(1 for t in tasks if t.status.value == "in_progress")
        completed = sum(1 for t in tasks if t.status.value == "done")
        
        about_text = """🚀 SGTI - Sistema de Gerenciamento de Tarefas Inteligente

Sou seu assistente pessoal de produtividade! Fui criado para ajudar você a organizar suas tarefas de forma inteligente.

💡 O que posso fazer por você:

📋 Gerenciar Tarefas
   Criar, editar, concluir e organizar suas atividades

🎯 Priorização Inteligente
   Sugiro qual tarefa você deveria fazer primeiro com base em prazos e prioridades

📊 Análise de Produtividade
   Mostro estatísticas e insights sobre seu desempenho

🗓️ Controle de Prazos
   Aviso sobre tarefas atrasadas ou próximas do vencimento

💬 Conversa Natural
   Você pode falar comigo naturalmente, sem comandos específicos!

"""
        
        # Add personalized context
        if total_tasks > 0:
            about_text += f"""📈 Seu panorama atual:
   Você tem {total_tasks} tarefa(s) no sistema
   {pending} pendente(s), {in_progress} em andamento, {completed} concluída(s)

"""
        
        about_text += """🎯 Experimente perguntar:
   "Qual tarefa devo fazer agora?"
   "Criar uma nova tarefa"
   "Minhas tarefas para hoje"
   "Meu progresso"

Estou aqui para ajudar! Como posso te auxiliar?"""

        return {
            "message": about_text,
            "action": "about_system",
            "data": {
                "total_tasks": total_tasks,
                "pending": pending,
                "in_progress": in_progress,
                "completed": completed
            }
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
            
            # Format status and priority in Portuguese
            status_pt = self._format_status_text(t.status)
            priority_pt = self._format_priority_text(t.priority)

            task_line = f"• {t.title} | Status: {status_pt} | Prioridade: {priority_pt}"
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
