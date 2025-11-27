"""
Serviço de notificações para alertar sobre prazos de tarefas
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from uuid import UUID

from domain.entities.task import Task
from domain.utils.datetime_utils import now_brazil

logger = logging.getLogger("sgti")


class NotificationService:
    """Serviço para gerenciar notificações de tarefas"""

    def __init__(self):
        pass

    def get_tasks_requiring_notification(
        self,
        tasks: List[Task],
        hours_ahead: int = 24
    ) -> Dict[str, List[Task]]:
        """
        Retorna tarefas que precisam de notificação agrupadas por urgência

        Args:
            tasks: Lista de tarefas do usuário
            hours_ahead: Quantas horas à frente verificar (padrão: 24h)

        Returns:
            Dict com categorias de notificações
        """
        now = now_brazil()
        threshold = now + timedelta(hours=hours_ahead)

        notifications = {
            "overdue": [],      # Tarefas atrasadas
            "due_today": [],    # Vence hoje
            "due_tomorrow": [], # Vence amanhã
            "due_soon": [],     # Vence em breve (até 24h)
            "high_priority_pending": []  # Alta prioridade sem prazo
        }

        for task in tasks:
            # Pular tarefas já concluídas ou canceladas
            if task.status in ["done", "cancelled"]:
                continue

            if task.due_date:
                due_date = task.due_date

                # Tarefa atrasada
                if due_date < now:
                    notifications["overdue"].append(task)

                # Vence hoje
                elif due_date.date() == now.date():
                    notifications["due_today"].append(task)

                # Vence amanhã
                elif due_date.date() == (now + timedelta(days=1)).date():
                    notifications["due_tomorrow"].append(task)

                # Vence em breve (próximas 24h)
                elif due_date <= threshold:
                    notifications["due_soon"].append(task)

            # Tarefas de alta prioridade sem prazo
            elif task.priority in ["alta", "urgente", "high", "urgent"]:
                notifications["high_priority_pending"].append(task)

        return notifications

    def format_notification_message(
        self,
        notifications: Dict[str, List[Task]]
    ) -> str:
        """
        Formata as notificações em uma mensagem legível

        Args:
            notifications: Dict com categorias de notificações

        Returns:
            Mensagem formatada
        """
        messages = []

        # Tarefas atrasadas (prioridade máxima)
        if notifications["overdue"]:
            count = len(notifications["overdue"])
            messages.append(f"URGENTE: {count} tarefa(s) ATRASADA(S)!")
            for task in notifications["overdue"][:3]:  # Mostrar até 3
                days_late = (now_brazil() - task.due_date).days
                messages.append(f"  - {task.title} (atrasada há {days_late} dia(s))")
            if count > 3:
                messages.append(f"  ... e mais {count - 3} tarefa(s)")

        # Vence hoje
        if notifications["due_today"]:
            count = len(notifications["due_today"])
            messages.append(f"\nVENCE HOJE: {count} tarefa(s)")
            for task in notifications["due_today"][:3]:
                time_str = task.due_date.strftime("%H:%M")
                messages.append(f"  - {task.title} às {time_str}")
            if count > 3:
                messages.append(f"  ... e mais {count - 3} tarefa(s)")

        # Vence amanhã
        if notifications["due_tomorrow"]:
            count = len(notifications["due_tomorrow"])
            messages.append(f"\nVENCE AMANHÃ: {count} tarefa(s)")
            for task in notifications["due_tomorrow"][:3]:
                time_str = task.due_date.strftime("%H:%M")
                messages.append(f"  - {task.title} às {time_str}")
            if count > 3:
                messages.append(f"  ... e mais {count - 3} tarefa(s)")

        # Alta prioridade sem prazo
        if notifications["high_priority_pending"]:
            count = len(notifications["high_priority_pending"])
            messages.append(f"\nALTA PRIORIDADE sem prazo: {count} tarefa(s)")
            for task in notifications["high_priority_pending"][:3]:
                messages.append(f"  - {task.title}")
            if count > 3:
                messages.append(f"  ... e mais {count - 3} tarefa(s)")

        if not messages:
            return "Nenhuma notificação pendente. Você está em dia com suas tarefas!"

        return "\n".join(messages)

    def get_notification_summary(
        self,
        notifications: Dict[str, List[Task]]
    ) -> Dict[str, Any]:
        """
        Retorna um resumo numérico das notificações

        Args:
            notifications: Dict com categorias de notificações

        Returns:
            Dict com estatísticas
        """
        return {
            "overdue_count": len(notifications["overdue"]),
            "due_today_count": len(notifications["due_today"]),
            "due_tomorrow_count": len(notifications["due_tomorrow"]),
            "due_soon_count": len(notifications["due_soon"]),
            "high_priority_pending_count": len(notifications["high_priority_pending"]),
            "total_notifications": sum(len(tasks) for tasks in notifications.values()),
            "has_urgent": len(notifications["overdue"]) > 0 or len(notifications["due_today"]) > 0
        }
