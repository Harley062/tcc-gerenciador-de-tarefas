"""
Chat Assistant Service - Natural language interface for task management
"""
import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta, timezone

from domain.entities.task import Task
from infrastructure.gpt.openai_adapter import OpenAIAdapter

logger = logging.getLogger("taskmaster")


class ChatAssistantService:
    """AI-powered chat assistant for natural language task management - GPT-4 only"""

    MAX_HISTORY_SIZE = 20  # Maximum number of messages to keep in history

    def __init__(
        self,
        openai_adapter: OpenAIAdapter,
    ):
        self.openai_adapter = openai_adapter
        self.conversation_history = []
    
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
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

            message_lower = message.lower()

            intent = self._detect_intent(message_lower)

            logger.info(
                "Intent detected",
                extra={"intent": intent, "message_preview": message[:50]}
            )

            if intent == "list_tasks":
                response = await self._handle_list_tasks(message_lower, user_tasks)
            elif intent == "create_task":
                response = await self._handle_create_task(message, user_tasks)
            elif intent == "update_task":
                response = await self._handle_update_task(message_lower, user_tasks)
            elif intent == "delete_task":
                response = await self._handle_delete_task(message_lower, user_tasks)
            elif intent == "task_status":
                response = await self._handle_task_status(message_lower, user_tasks)
            elif intent == "help":
                response = self._handle_help()
            else:
                response = await self._handle_general_query(message, user_tasks)

            self.conversation_history.append({
                "role": "assistant",
                "content": response.get("message", ""),
                "timestamp": datetime.now(timezone.utc).isoformat()
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
                "message": f"Desculpe, ocorreu um erro ao processar sua mensagem: {str(e)}",
                "action": None,
                "data": None
            }
    
    def _detect_intent(self, message: str) -> str:
        """Detect user intent from message with improved accuracy"""

        # Keywords for each intent with priority order
        list_keywords = ["listar", "mostrar", "quais", "ver", "exibir", "list", "show", "what", "display", "me mostre", "me mostra", "tenho", "tem", "há"]
        task_keywords = ["tarefa", "tarefas", "task", "tasks", "todo", "todos", "atividade", "atividades", "fazer", "pendente", "pendentes"]
        time_keywords = ["hoje", "amanhã", "semana", "mês", "today", "tomorrow", "week", "month", "agora", "próximo", "próxima"]
        status_filter_keywords = ["pendente", "pendentes", "progresso", "concluída", "concluídas", "pending", "done", "completed", "in progress"]
        priority_keywords = ["alta", "high", "urgente", "urgent", "prioridade", "priority", "importante", "important"]

        create_keywords = ["criar", "adicionar", "nova", "novo", "create", "add", "new", "cadastrar", "registrar"]
        update_keywords = ["atualizar", "modificar", "mudar", "alterar", "editar", "update", "modify", "change", "edit"]
        delete_keywords = ["deletar", "remover", "excluir", "apagar", "delete", "remove"]
        status_keywords = ["status", "andamento", "progress", "situação", "resumo", "overview", "como está", "como estão"]
        help_keywords = ["ajuda", "help", "como", "how", "comandos", "commands", "o que você faz", "o que faz"]

        # Priority-based detection (specific intents first)

        # Help - highest priority for explicit help requests
        if any(word in message for word in help_keywords):
            if "tarefa" not in message and "task" not in message:
                return "help"

        # Status - check for status queries
        if any(word in message for word in status_keywords):
            if any(word in message for word in task_keywords) or "minha" in message or "meu" in message:
                return "task_status"

        # Create task - must have create keyword
        if any(word in message for word in create_keywords):
            return "create_task"

        # Delete task - must have delete keyword AND task reference
        if any(word in message for word in delete_keywords):
            if any(word in message for word in task_keywords) or len(message.split()) > 3:
                return "delete_task"

        # Update task - must have update keyword AND task reference
        if any(word in message for word in update_keywords):
            if any(word in message for word in task_keywords) or len(message.split()) > 3:
                return "update_task"

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
            if any(word in message for word in task_keywords):
                return "list_tasks"

        # Questions about tasks (e.g., "o que tenho pra fazer?")
        if any(word in message for word in ["o que", "what", "quais", "which"]):
            if any(word in message for word in task_keywords + ["fazer", "to do", "pendente", "pending"]):
                return "list_tasks"

        # Default to general for anything else
        return "general"
    
    async def _handle_list_tasks(
        self,
        message: str,
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle request to list tasks"""

        filtered_tasks = tasks

        if "hoje" in message or "today" in message:
            today = datetime.now(timezone.utc).date()
            filtered_tasks = [
                t for t in tasks
                if t.due_date and t.due_date.date() == today
            ]
            period = "hoje"
        elif "amanhã" in message or "tomorrow" in message:
            tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date()
            filtered_tasks = [
                t for t in tasks
                if t.due_date and t.due_date.date() == tomorrow
            ]
            period = "amanhã"
        elif "semana" in message or "week" in message:
            week_end = datetime.now(timezone.utc) + timedelta(days=7)
            filtered_tasks = [
                t for t in tasks
                if t.due_date and t.due_date <= week_end
            ]
            period = "esta semana"
        elif "pendente" in message or "pending" in message or "todo" in message:
            filtered_tasks = [t for t in tasks if t.status in ["pending", "todo"]]
            period = "pendentes"
        elif "progresso" in message or "progress" in message:
            filtered_tasks = [t for t in tasks if t.status == "in_progress"]
            period = "em progresso"
        elif "concluída" in message or "done" in message or "completed" in message:
            filtered_tasks = [t for t in tasks if t.status == "done"]
            period = "concluídas"
        elif "alta" in message or "high" in message or "priorit" in message:
            filtered_tasks = [t for t in tasks if t.priority in ["alta", "high"]]
            period = "de alta prioridade"
        elif "urgente" in message or "urgent" in message:
            filtered_tasks = [t for t in tasks if t.priority in ["urgente", "urgent"]]
            period = "urgentes"
        else:
            period = "todas"
        
        if not filtered_tasks:
            return {
                "message": f"Você não tem tarefas {period}.",
                "action": None,
                "data": None
            }

        # Helper function for date formatting
        def format_date(due_date) -> str:
            if not due_date:
                return ""
            now = datetime.now(timezone.utc)
            date_diff = (due_date.date() - now.date()).days

            if date_diff < 0:
                return f" [ATRASADA {abs(date_diff)}d]"
            elif date_diff == 0:
                return f" [HOJE {due_date.strftime('%H:%M')}]"
            elif date_diff == 1:
                return f" [AMANHÃ {due_date.strftime('%H:%M')}]"
            else:
                return f" [{due_date.strftime('%d/%m %H:%M')}]"

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
        """Handle request to create a task"""

        task_text = message
        message_lower = message.lower()

        for prefix in ["nova tarefa", "new task", "criar", "adicionar", "create", "add"]:
            prefix_with_colon = prefix + ":"
            prefix_with_space = prefix + " "

            if message_lower.startswith(prefix_with_colon):
                task_text = message[len(prefix_with_colon):].strip()
                break
            elif message_lower.startswith(prefix_with_space):
                task_text = message[len(prefix_with_space):].strip()
                break
            elif message_lower.startswith(prefix):
                task_text = message[len(prefix):].strip()
                break

        return {
            "message": f"Vou criar a tarefa: '{task_text}'. Use o parser de linguagem natural para extrair os detalhes.",
            "action": "create",
            "data": {
                "text": task_text
            }
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
            if len(word) > 3 and word not in ["deletar", "remover", "excluir", "delete", "remove"]:
                task_keywords.append(word)
        
        if not task_keywords:
            return {
                "message": "Qual tarefa você quer deletar? Por favor, seja mais específico.",
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
                "message": f"Tem certeza que quer deletar '{task.title}'?",
                "action": "delete",
                "data": {
                    "task_id": str(task.id),
                    "task_title": task.title
                }
            }
        else:
            task_list = "\n".join([f"• {t.title}" for t in matching_tasks[:5]])
            return {
                "message": f"Encontrei {len(matching_tasks)} tarefas:\n\n{task_list}\n\nQual delas você quer deletar?",
                "action": "select",
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
        """Handle request for task status summary"""
        
        total = len(tasks)
        pending = len([t for t in tasks if t.status == "pending"])
        todo = len([t for t in tasks if t.status == "todo"])
        in_progress = len([t for t in tasks if t.status == "in_progress"])
        done = len([t for t in tasks if t.status == "done"])
        
        completion_rate = (done / total * 100) if total > 0 else 0
        
        high_priority = len([t for t in tasks if t.priority == "high" and t.status != "done"])
        
        message_text = f"""Status das suas tarefas:

Total: {total} tarefas
Concluídas: {done} ({completion_rate:.1f}%)
Em progresso: {in_progress}
Pendentes: {pending}
A fazer: {todo}

{f'ATENÇÃO: Você tem {high_priority} tarefa(s) de alta prioridade pendente(s).' if high_priority > 0 else 'Nenhuma tarefa de alta prioridade pendente.'}"""
        
        return {
            "message": message_text,
            "action": "status",
            "data": {
                "total": total,
                "pending": pending,
                "todo": todo,
                "in_progress": in_progress,
                "done": done,
                "completion_rate": completion_rate,
                "high_priority_pending": high_priority
            }
        }
    
    def _handle_help(self) -> Dict[str, Any]:
        """Handle help request"""

        help_text = """Assistente de Tarefas - Comandos e Perguntas:

CONSULTAR TAREFAS (busco no sistema):
- "O que tenho para hoje?"
- "Tarefas pendentes"
- "Tarefas de alta prioridade"
- "O que tenho para amanhã?"
- "Mostre tarefas atrasadas"
- "Tarefas da semana"

CRIAR TAREFAS:
- "Criar reunião com cliente amanhã às 14h"
- "Adicionar tarefa: desenvolver API"
- "Nova tarefa: revisar código"

ATUALIZAR TAREFAS:
- "Atualizar tarefa de reunião"
- "Modificar prazo da apresentação"

DELETAR TAREFAS:
- "Deletar tarefa de backup"
- "Remover reunião cancelada"

STATUS E ANÁLISE:
- "Qual o status das minhas tarefas?"
- "Como está meu progresso?"
- "Quantas tarefas tenho?"

Dica: Seja natural! Eu analiso suas tarefas REAIS do sistema e respondo com informações precisas."""

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

        # Get current date for temporal context
        from datetime import datetime, timedelta
        now = datetime.now()
        today = now.date()
        tomorrow = (now + timedelta(days=1)).date()

        # Build concise task context with temporal annotations (no descriptions to save tokens)
        task_lines = []
        for t in tasks[:30]:
            # Add temporal context
            temporal_tag = ""
            if t.due_date:
                task_date = t.due_date.date()
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

        # Add current date/time context for better filtering
        from datetime import datetime
        current_datetime = datetime.now()
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
