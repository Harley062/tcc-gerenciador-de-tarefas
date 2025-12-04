from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


@dataclass
class UserSettings:
    user_id: UUID
    llm_provider: str = "llama"
    openai_api_key: Optional[str] = None
    llama_endpoint: str = "http://localhost:11434"
    default_task_duration: int = 60
    enable_auto_subtasks: bool = False
    enable_auto_priority: bool = True
    enable_auto_tags: bool = True
    id: UUID = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "llm_provider": self.llm_provider,
            "openai_api_key": "***" if self.openai_api_key else None,
            "llama_endpoint": self.llama_endpoint,
            "default_task_duration": self.default_task_duration,
            "enable_auto_subtasks": self.enable_auto_subtasks,
            "enable_auto_priority": self.enable_auto_priority,
            "enable_auto_tags": self.enable_auto_tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
