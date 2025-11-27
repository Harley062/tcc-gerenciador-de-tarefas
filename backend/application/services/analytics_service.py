"""
Serviço de Analytics - Levantamento e análise de dados das tarefas
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict, Counter

from domain.entities.task import Task
from domain.utils.datetime_utils import now_brazil

logger = logging.getLogger("sgti")


# Helpers para verificar status (suporta português e inglês)
def get_status_value(status) -> str:
    """Obtém o valor string do status (suporta Enum e string)"""
    return status.value if hasattr(status, 'value') else str(status)

def is_done(status) -> bool:
    s = get_status_value(status)
    return s in ["done", "concluida"]

def is_cancelled(status) -> bool:
    s = get_status_value(status)
    return s in ["cancelled", "cancelada"]

def is_active(status) -> bool:
    return not is_done(status) and not is_cancelled(status)


class AnalyticsService:
    """Serviço para análise de dados e geração de relatórios de tarefas"""

    def __init__(self):
        pass

    def generate_full_report(
        self,
        tasks: List[Task],
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Gera relatório completo de analytics das tarefas

        Args:
            tasks: Lista de todas as tarefas do usuário
            period_days: Período em dias para análise temporal (padrão: 30)

        Returns:
            Dict com todos os dados analytics
        """
        now = now_brazil()
        period_start = now - timedelta(days=period_days)

        return {
            "summary": self.get_summary_stats(tasks),
            "completion": self.get_completion_stats(tasks, period_start),
            "priority_distribution": self.get_priority_distribution(tasks),
            "status_distribution": self.get_status_distribution(tasks),
            "time_analysis": self.get_time_analysis(tasks),
            "productivity": self.get_productivity_metrics(tasks, period_start),
            "trends": self.get_trends(tasks, period_days),
            "tags_analysis": self.get_tags_analysis(tasks),
            "overdue_analysis": self.get_overdue_analysis(tasks),
            "project_distribution": self.get_project_distribution(tasks)
        }

    def get_summary_stats(self, tasks: List[Task]) -> Dict[str, Any]:
        """Estatísticas resumidas gerais"""
        total = len(tasks)
        if total == 0:
            return {
                "total_tasks": 0,
                "active_tasks": 0,
                "completed_tasks": 0,
                "completion_rate": 0.0
            }

        active = len([t for t in tasks if is_active(t.status)])
        completed = len([t for t in tasks if is_done(t.status)])
        cancelled = len([t for t in tasks if is_cancelled(t.status)])

        return {
            "total_tasks": total,
            "active_tasks": active,
            "completed_tasks": completed,
            "cancelled_tasks": cancelled,
            "completion_rate": round((completed / total) * 100, 2) if total > 0 else 0.0,
            "cancellation_rate": round((cancelled / total) * 100, 2) if total > 0 else 0.0
        }

    def get_completion_stats(
        self,
        tasks: List[Task],
        period_start: datetime
    ) -> Dict[str, Any]:
        """Estatísticas de conclusão de tarefas"""
        completed_tasks = [
            t for t in tasks
            if is_done(t.status) and t.completed_at and t.completed_at >= period_start
        ]

        if not completed_tasks:
            return {
                "completed_in_period": 0,
                "avg_completion_time_hours": None,
                "completed_on_time": 0,
                "completed_late": 0,
                "on_time_rate": 0.0
            }

        # Calcular tempo médio de conclusão
        completion_times = []
        on_time = 0
        late = 0

        for task in completed_tasks:
            # Tempo desde criação até conclusão
            if task.created_at and task.completed_at:
                delta = task.completed_at - task.created_at
                completion_times.append(delta.total_seconds() / 3600)  # em horas

            # Verificar se foi concluída no prazo
            if task.due_date:
                if task.completed_at <= task.due_date:
                    on_time += 1
                else:
                    late += 1

        avg_time = sum(completion_times) / len(completion_times) if completion_times else None

        return {
            "completed_in_period": len(completed_tasks),
            "avg_completion_time_hours": round(avg_time, 2) if avg_time else None,
            "completed_on_time": on_time,
            "completed_late": late,
            "on_time_rate": round((on_time / (on_time + late)) * 100, 2) if (on_time + late) > 0 else 0.0
        }

    def get_priority_distribution(self, tasks: List[Task]) -> Dict[str, int]:
        """Distribuição de tarefas por prioridade"""
        active_tasks = [t for t in tasks if is_active(t.status)]
        priorities = Counter(t.priority for t in active_tasks)

        return {
            "urgente": priorities.get("urgente", 0) + priorities.get("urgent", 0),
            "alta": priorities.get("alta", 0) + priorities.get("high", 0),
            "media": priorities.get("media", 0) + priorities.get("medium", 0),
            "baixa": priorities.get("baixa", 0) + priorities.get("low", 0)
        }

    def get_status_distribution(self, tasks: List[Task]) -> Dict[str, int]:
        """Distribuição de tarefas por status"""
        statuses = Counter(t.status for t in tasks)

        return {
            "pending": statuses.get("pending", 0),
            "todo": statuses.get("todo", 0),
            "in_progress": statuses.get("in_progress", 0),
            "done": statuses.get("done", 0),
            "cancelled": statuses.get("cancelled", 0)
        }

    def get_time_analysis(self, tasks: List[Task]) -> Dict[str, Any]:
        """Análise de prazos e tempo estimado"""
        tasks_with_due = [t for t in tasks if t.due_date and is_active(t.status)]
        tasks_with_estimate = [t for t in tasks if t.estimated_duration]

        now = now_brazil()
        overdue = len([t for t in tasks_with_due if t.due_date < now])
        due_today = len([t for t in tasks_with_due if t.due_date.date() == now.date()])
        due_week = len([
            t for t in tasks_with_due
            if now.date() < t.due_date.date() <= (now + timedelta(days=7)).date()
        ])

        # Tempo estimado total
        total_estimated_minutes = sum(t.estimated_duration for t in tasks_with_estimate)
        active_estimated = sum(
            t.estimated_duration for t in tasks_with_estimate
            if is_active(t.status)
        )

        return {
            "overdue_count": overdue,
            "due_today_count": due_today,
            "due_this_week_count": due_week,
            "total_estimated_hours": round(total_estimated_minutes / 60, 2) if total_estimated_minutes else 0,
            "active_estimated_hours": round(active_estimated / 60, 2) if active_estimated else 0,
            "tasks_with_estimate": len(tasks_with_estimate)
        }

    def get_productivity_metrics(
        self,
        tasks: List[Task],
        period_start: datetime
    ) -> Dict[str, Any]:
        """Métricas de produtividade"""
        period_tasks = [t for t in tasks if t.created_at >= period_start]
        completed_in_period = [
            t for t in period_tasks
            if is_done(t.status) and t.completed_at
        ]

        now = now_brazil()
        days_in_period = max((now - period_start).days, 1)

        return {
            "tasks_created_in_period": len(period_tasks),
            "tasks_completed_in_period": len(completed_in_period),
            "avg_tasks_created_per_day": round(len(period_tasks) / days_in_period, 2),
            "avg_tasks_completed_per_day": round(len(completed_in_period) / days_in_period, 2),
            "completion_velocity": round(
                (len(completed_in_period) / len(period_tasks)) * 100, 2
            ) if period_tasks else 0.0
        }

    def get_trends(self, tasks: List[Task], days: int = 30) -> Dict[str, List[Dict]]:
        """Tendências ao longo do tempo"""
        now = now_brazil()
        start_date = (now - timedelta(days=days)).date()

        # Agrupar por dia
        created_by_day = defaultdict(int)
        completed_by_day = defaultdict(int)

        for task in tasks:
            if task.created_at and task.created_at.date() >= start_date:
                created_by_day[task.created_at.date()] += 1

            if is_done(task.status) and task.completed_at and task.completed_at.date() >= start_date:
                completed_by_day[task.completed_at.date()] += 1

        # Criar lista de dias
        trends = []
        current_date = start_date
        while current_date <= now.date():
            trends.append({
                "date": current_date.isoformat(),
                "created": created_by_day.get(current_date, 0),
                "completed": completed_by_day.get(current_date, 0)
            })
            current_date += timedelta(days=1)

        return {"daily_trends": trends}

    def get_tags_analysis(self, tasks: List[Task]) -> Dict[str, Any]:
        """Análise de tags utilizadas"""
        all_tags = []
        for task in tasks:
            if task.tags:
                all_tags.extend(task.tags)

        if not all_tags:
            return {
                "total_unique_tags": 0,
                "most_used_tags": [],
                "tags_usage": {}
            }

        tag_counts = Counter(all_tags)
        most_used = tag_counts.most_common(10)

        return {
            "total_unique_tags": len(tag_counts),
            "most_used_tags": [
                {"tag": tag, "count": count}
                for tag, count in most_used
            ],
            "tags_usage": dict(tag_counts)
        }

    def get_overdue_analysis(self, tasks: List[Task]) -> Dict[str, Any]:
        """Análise detalhada de tarefas atrasadas"""
        now = now_brazil()
        overdue_tasks = [
            t for t in tasks
            if t.due_date
            and t.due_date < now
            and is_active(t.status)
        ]

        if not overdue_tasks:
            return {
                "total_overdue": 0,
                "avg_days_overdue": 0,
                "max_days_overdue": 0,
                "overdue_by_priority": {}
            }

        # Calcular dias de atraso
        days_overdue = [(now - t.due_date).days for t in overdue_tasks]

        # Agrupar por prioridade
        by_priority = defaultdict(int)
        for task in overdue_tasks:
            by_priority[task.priority] += 1

        return {
            "total_overdue": len(overdue_tasks),
            "avg_days_overdue": round(sum(days_overdue) / len(days_overdue), 1),
            "max_days_overdue": max(days_overdue),
            "overdue_by_priority": dict(by_priority)
        }

    def get_project_distribution(self, tasks: List[Task]) -> Dict[str, Any]:
        """Distribuição de tarefas por projeto"""
        with_project = len([t for t in tasks if t.project_id])
        without_project = len([t for t in tasks if not t.project_id])

        projects = defaultdict(int)
        for task in tasks:
            if task.project_id:
                projects[str(task.project_id)] += 1

        return {
            "tasks_with_project": with_project,
            "tasks_without_project": without_project,
            "unique_projects": len(projects),
            "tasks_per_project": dict(projects)
        }

    def generate_insights(self, report: Dict[str, Any]) -> List[str]:
        """
        Gera insights automáticos baseados no relatório

        Args:
            report: Relatório completo gerado por generate_full_report

        Returns:
            Lista de insights em português
        """
        insights = []

        # Insights de conclusão
        completion_rate = report["summary"]["completion_rate"]
        if completion_rate >= 80:
            insights.append(f"Excelente! Você tem {completion_rate}% de taxa de conclusão.")
        elif completion_rate >= 60:
            insights.append(f"Boa taxa de conclusão: {completion_rate}%. Continue assim!")
        elif completion_rate < 40:
            insights.append(f"Taxa de conclusão baixa ({completion_rate}%). Considere revisar suas prioridades.")

        # Insights de atraso
        overdue = report["overdue_analysis"]["total_overdue"]
        if overdue > 0:
            avg_days = report["overdue_analysis"]["avg_days_overdue"]
            insights.append(f"ATENÇÃO: {overdue} tarefas atrasadas (média de {avg_days} dias de atraso).")

        # Insights de prioridade
        urgent = report["priority_distribution"]["urgente"]
        high = report["priority_distribution"]["alta"]
        if urgent + high > 5:
            insights.append(f"Você tem {urgent + high} tarefas de alta prioridade/urgentes. Foque nelas!")

        # Insights de produtividade
        velocity = report["productivity"]["completion_velocity"]
        if velocity >= 70:
            insights.append(f"Ótima velocidade de conclusão: {velocity}%!")
        elif velocity < 30:
            insights.append(f"Velocidade de conclusão baixa ({velocity}%). Você pode estar criando muitas tarefas.")

        # Insights de prazo
        on_time_rate = report["completion"]["on_time_rate"]
        if on_time_rate >= 80:
            insights.append(f"Parabéns! {on_time_rate}% das tarefas concluídas no prazo.")
        elif on_time_rate < 50 and on_time_rate > 0:
            insights.append(f"Apenas {on_time_rate}% das tarefas foram concluídas no prazo. Revise seus prazos.")

        if not insights:
            insights.append("Continue mantendo suas tarefas organizadas!")

        return insights
