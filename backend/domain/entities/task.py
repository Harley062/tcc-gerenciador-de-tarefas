from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from domain.value_objects.priority import Priority
from domain.value_objects.task_status import TaskStatus
from domain.utils.datetime_utils import now_brazil


class Task:
    def __init__(
        self,
        user_id: UUID,
        title: str,
        description: Optional[str] = None,
        status: TaskStatus = TaskStatus.PENDING,
        priority: Priority = Priority.MEDIA,
        due_date: Optional[datetime] = None,
        estimated_duration: Optional[int] = None,
        actual_duration: Optional[int] = None,
        completed_at: Optional[datetime] = None,
        tags: Optional[list[str]] = None,
        metadata: Optional[dict[str, Any]] = None,
        natural_language_input: Optional[str] = None,
        gpt_response: Optional[dict[str, Any]] = None,
        project_id: Optional[UUID] = None,
        parent_task_id: Optional[UUID] = None,
        id: Optional[UUID] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
    ):
        self.id = id or uuid4()
        self.user_id = user_id
        self.project_id = project_id
        self.parent_task_id = parent_task_id
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.due_date = due_date
        self.estimated_duration = estimated_duration
        self.actual_duration = actual_duration
        self.completed_at = completed_at
        self.tags = tags or []
        self.metadata = metadata or {}
        self.natural_language_input = natural_language_input
        self.gpt_response = gpt_response
        self.created_at = created_at or now_brazil()
        self.updated_at = updated_at or now_brazil()

    def mark_completed(self) -> None:
        self.status = TaskStatus.DONE
        self.completed_at = now_brazil()
        self.updated_at = now_brazil()

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "project_id": str(self.project_id) if self.project_id else None,
            "parent_task_id": str(self.parent_task_id) if self.parent_task_id else None,
            "title": self.title,
            "description": self.description,
            "status": self.status.value,
            "priority": self.priority.value,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "estimated_duration": self.estimated_duration,
            "actual_duration": self.actual_duration,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "tags": self.tags,
            "metadata": self.metadata,
            "natural_language_input": self.natural_language_input,
            "gpt_response": self.gpt_response,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
