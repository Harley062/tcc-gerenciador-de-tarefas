"""
Analytics API Routes
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from application.services.analytics_service import AnalyticsService
from application.services.notification_service import NotificationService
from domain.entities.user import User
from infrastructure.database.postgresql_repository import PostgreSQLTaskRepository
from presentation.api.dependencies import get_current_user, get_db_session
from pydantic import BaseModel

logger = logging.getLogger("taskmaster")

router = APIRouter(prefix="/analytics", tags=["analytics"])


class AnalyticsReportResponse(BaseModel):
    summary: dict
    completion: dict
    priority_distribution: dict
    status_distribution: dict
    time_analysis: dict
    productivity: dict
    trends: dict
    tags_analysis: dict
    overdue_analysis: dict
    project_distribution: dict


class NotificationsResponse(BaseModel):
    overdue: list[dict]
    due_today: list[dict]
    due_tomorrow: list[dict]
    due_soon: list[dict]
    high_priority_pending: list[dict]
    summary: dict
    message: str


class InsightsResponse(BaseModel):
    insights: list[str]
    report_summary: dict


@router.get("/report", response_model=AnalyticsReportResponse)
async def get_analytics_report(
    period_days: int = Query(default=30, ge=1, le=365, description="Período em dias para análise"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Retorna relatório completo de analytics das tarefas do usuário

    Args:
        period_days: Número de dias para análise temporal (1-365)
    """
    try:
        logger.info(
            f"Generating analytics report for user {current_user.id}",
            extra={"period_days": period_days}
        )

        # Buscar todas as tarefas do usuário
        repo = PostgreSQLTaskRepository(session)
        tasks, _ = await repo.get_by_user_id(current_user.id, limit=10000)

        # Gerar relatório
        analytics_service = AnalyticsService()
        report = analytics_service.generate_full_report(tasks, period_days=period_days)

        logger.info(f"Analytics report generated successfully for user {current_user.id}")

        return AnalyticsReportResponse(**report)

    except Exception as e:
        logger.error(f"Failed to generate analytics report: {e}", exc_info=True)
        raise


@router.get("/insights", response_model=InsightsResponse)
async def get_insights(
    period_days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Retorna insights automáticos baseados nas tarefas do usuário
    """
    try:
        # Buscar tarefas
        repo = PostgreSQLTaskRepository(session)
        tasks, _ = await repo.get_by_user_id(current_user.id, limit=10000)

        # Gerar relatório e insights
        analytics_service = AnalyticsService()
        report = analytics_service.generate_full_report(tasks, period_days=period_days)
        insights = analytics_service.generate_insights(report)

        return InsightsResponse(
            insights=insights,
            report_summary=report["summary"]
        )

    except Exception as e:
        logger.error(f"Failed to generate insights: {e}", exc_info=True)
        raise


@router.get("/notifications", response_model=NotificationsResponse)
async def get_notifications(
    hours_ahead: int = Query(default=24, ge=1, le=168, description="Horas à frente para verificar"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Retorna notificações de tarefas que precisam de atenção

    Args:
        hours_ahead: Quantas horas à frente verificar (1-168)
    """
    try:
        logger.info(
            f"Getting notifications for user {current_user.id}",
            extra={"hours_ahead": hours_ahead}
        )

        # Buscar tarefas ativas
        repo = PostgreSQLTaskRepository(session)
        tasks, _ = await repo.get_by_user_id(current_user.id, limit=10000)

        # Gerar notificações
        notification_service = NotificationService()
        notifications = notification_service.get_tasks_requiring_notification(
            tasks, hours_ahead=hours_ahead
        )

        # Formatar notificações
        message = notification_service.format_notification_message(notifications)
        summary = notification_service.get_notification_summary(notifications)

        # Converter tarefas para dict
        result = {
            "overdue": [t.to_dict() for t in notifications["overdue"]],
            "due_today": [t.to_dict() for t in notifications["due_today"]],
            "due_tomorrow": [t.to_dict() for t in notifications["due_tomorrow"]],
            "due_soon": [t.to_dict() for t in notifications["due_soon"]],
            "high_priority_pending": [t.to_dict() for t in notifications["high_priority_pending"]],
            "summary": summary,
            "message": message
        }

        logger.info(f"Notifications generated: {summary['total_notifications']} total")

        return NotificationsResponse(**result)

    except Exception as e:
        logger.error(f"Failed to get notifications: {e}", exc_info=True)
        raise


@router.get("/productivity-score")
async def get_productivity_score(
    period_days: int = Query(default=7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Calcula score de produtividade do usuário (0-100)
    """
    try:
        repo = PostgreSQLTaskRepository(session)
        tasks, _ = await repo.get_by_user_id(current_user.id, limit=10000)

        analytics_service = AnalyticsService()
        report = analytics_service.generate_full_report(tasks, period_days=period_days)

        # Calcular score baseado em múltiplos fatores
        completion_rate = report["summary"]["completion_rate"]
        on_time_rate = report["completion"]["on_time_rate"]
        velocity = report["productivity"]["completion_velocity"]

        # Score ponderado
        score = (
            completion_rate * 0.4 +
            on_time_rate * 0.3 +
            velocity * 0.3
        )

        # Penalizar por tarefas atrasadas
        overdue_count = report["overdue_analysis"]["total_overdue"]
        if overdue_count > 0:
            penalty = min(overdue_count * 5, 30)  # Máximo 30 pontos de penalidade
            score = max(score - penalty, 0)

        return {
            "score": round(min(score, 100), 1),
            "completion_rate": completion_rate,
            "on_time_rate": on_time_rate,
            "velocity": velocity,
            "overdue_count": overdue_count,
            "rating": _get_rating(score)
        }

    except Exception as e:
        logger.error(f"Failed to calculate productivity score: {e}", exc_info=True)
        raise


def _get_rating(score: float) -> str:
    """Retorna rating baseado no score"""
    if score >= 90:
        return "Excelente"
    elif score >= 75:
        return "Muito Bom"
    elif score >= 60:
        return "Bom"
    elif score >= 40:
        return "Regular"
    else:
        return "Precisa Melhorar"
