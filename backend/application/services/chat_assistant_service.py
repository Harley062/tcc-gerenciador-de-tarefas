"""
Chat Assistant Service - Natural language interface for task management
"""
import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta
import re

from domain.entities.task import Task
from infrastructure.gpt.openai_adapter import OpenAIAdapter
from infrastructure.llm.llama_adapter import LlamaAdapter

logger = logging.getLogger("taskmaster")


class ChatAssistantService:
    """AI-powered chat assistant for natural language task management"""
    
    def __init__(
        self,
        openai_adapter: Optional[OpenAIAdapter] = None,
        llama_adapter: Optional[LlamaAdapter] = None,
        provider: str = "llama"
    ):
        self.openai_adapter = openai_adapter
        self.llama_adapter = llama_adapter
        self.provider = provider
        self.conversation_history = []
    
    async def process_message(
        self, 
        message: str,
        user_tasks: List[Task],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process a chat message and return appropriate response with actions"""
        
        self.conversation_history.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        message_lower = message.lower()
        
        intent = self._detect_intent(message_lower)
        
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
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return response
    
    def _detect_intent(self, message: str) -> str:
        """Detect user intent from message"""
        
        if any(word in message for word in ["listar", "mostrar", "quais", "list", "show", "what"]):
            if any(word in message for word in ["tarefa", "task", "todo"]):
                return "list_tasks"
        
        if any(word in message for word in ["criar", "adicionar", "nova", "create", "add", "new"]):
            return "create_task"
        
        if any(word in message for word in ["atualizar", "modificar", "mudar", "update", "modify", "change"]):
            return "update_task"
        
        if any(word in message for word in ["deletar", "remover", "excluir", "delete", "remove"]):
            return "delete_task"
        
        if any(word in message for word in ["status", "progresso", "andamento", "progress"]):
            return "task_status"
        
        if any(word in message for word in ["ajuda", "help", "como", "how"]):
            return "help"
        
        return "general"
    
    async def _handle_list_tasks(
        self, 
        message: str, 
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle request to list tasks"""
        
        filtered_tasks = tasks
        
        if "hoje" in message or "today" in message:
            today = datetime.utcnow().date()
            filtered_tasks = [
                t for t in tasks 
                if t.due_date and t.due_date.date() == today
            ]
            period = "hoje"
        elif "amanhã" in message or "tomorrow" in message:
            tomorrow = (datetime.utcnow() + timedelta(days=1)).date()
            filtered_tasks = [
                t for t in tasks 
                if t.due_date and t.due_date.date() == tomorrow
            ]
            period = "amanhã"
        elif "semana" in message or "week" in message:
            week_end = datetime.utcnow() + timedelta(days=7)
            filtered_tasks = [
                t for t in tasks 
                if t.due_date and t.due_date <= week_end
            ]
            period = "esta semana"
        elif "pendente" in message or "pending" in message or "todo" in message:
            filtered_tasks = [t for t in tasks if t.status == "todo"]
            period = "pendentes"
        elif "progresso" in message or "progress" in message:
            filtered_tasks = [t for t in tasks if t.status == "in_progress"]
            period = "em progresso"
        elif "concluída" in message or "done" in message or "completed" in message:
            filtered_tasks = [t for t in tasks if t.status == "done"]
            period = "concluídas"
        elif "alta" in message or "high" in message or "priorit" in message:
            filtered_tasks = [t for t in tasks if t.priority == "high"]
            period = "de alta prioridade"
        else:
            period = "todas"
        
        if not filtered_tasks:
            return {
                "message": f"Você não tem tarefas {period}. 🎉",
                "action": None,
                "data": None
            }
        
        task_list = "\n".join([
            f"• {t.title} ({t.status}) - Prioridade: {t.priority}"
            for t in filtered_tasks[:10]
        ])
        
        return {
            "message": f"Você tem {len(filtered_tasks)} tarefa(s) {period}:\n\n{task_list}",
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
        for prefix in ["criar", "adicionar", "nova tarefa", "create", "add", "new task"]:
            if prefix in message.lower():
                task_text = re.sub(rf"{prefix}:?\s*", "", message, flags=re.IGNORECASE)
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
        todo = len([t for t in tasks if t.status == "todo"])
        in_progress = len([t for t in tasks if t.status == "in_progress"])
        done = len([t for t in tasks if t.status == "done"])
        
        completion_rate = (done / total * 100) if total > 0 else 0
        
        high_priority = len([t for t in tasks if t.priority == "high" and t.status != "done"])
        
        message_text = f"""📊 Status das suas tarefas:

Total: {total} tarefas
✅ Concluídas: {done} ({completion_rate:.1f}%)
🔄 Em progresso: {in_progress}
📝 A fazer: {todo}

{f'⚠️ Você tem {high_priority} tarefa(s) de alta prioridade pendente(s).' if high_priority > 0 else '🎉 Nenhuma tarefa de alta prioridade pendente!'}"""
        
        return {
            "message": message_text,
            "action": "status",
            "data": {
                "total": total,
                "todo": todo,
                "in_progress": in_progress,
                "done": done,
                "completion_rate": completion_rate,
                "high_priority_pending": high_priority
            }
        }
    
    def _handle_help(self) -> Dict[str, Any]:
        """Handle help request"""
        
        help_text = """🤖 Assistente de Tarefas - Comandos disponíveis:

📋 **Listar tarefas:**
• "Quais tarefas tenho hoje?"
• "Mostre minhas tarefas pendentes"
• "Liste tarefas de alta prioridade"

➕ **Criar tarefas:**
• "Criar reunião com cliente amanhã às 14h"
• "Adicionar tarefa: desenvolver API"

✏️ **Atualizar tarefas:**
• "Atualizar tarefa de reunião"
• "Modificar prazo da apresentação"

🗑️ **Deletar tarefas:**
• "Deletar tarefa de backup"
• "Remover reunião cancelada"

📊 **Status:**
• "Qual o status das minhas tarefas?"
• "Como está meu progresso?"

💡 **Dica:** Seja natural! Eu entendo português e inglês."""
        
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
        """Handle general queries using AI if available"""
        
        if self.provider == "gpt4" and self.openai_adapter:
            return await self._handle_with_gpt(message, tasks)
        elif self.provider == "llama" and self.llama_adapter:
            return await self._handle_with_llama(message, tasks)
        else:
            return {
                "message": "Desculpe, não entendi. Digite 'ajuda' para ver os comandos disponíveis.",
                "action": None,
                "data": None
            }
    
    async def _handle_with_gpt(
        self, 
        message: str, 
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle query using GPT-4"""
        
        task_summary = "\n".join([
            f"- {t.title} ({t.status}, {t.priority})"
            for t in tasks[:20]
        ])
        
        prompt = f"""You are a helpful task management assistant. The user has these tasks:

{task_summary}

User message: {message}

Provide a helpful response in Portuguese. Be concise and actionable."""
        
        try:
            result = await self.openai_adapter.generate_completion(prompt=prompt)
            return {
                "message": result.get("content", "Desculpe, não consegui processar sua mensagem."),
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
    
    async def _handle_with_llama(
        self, 
        message: str, 
        tasks: List[Task]
    ) -> Dict[str, Any]:
        """Handle query using Llama"""
        
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
