from datetime import datetime
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import (
    ARRAY,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Numeric,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")


def now_brazil():
    """Retorna a data/hora atual no timezone de Brasília"""
    return datetime.now(BRAZIL_TZ)


class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_brazil)
    updated_at = Column(DateTime(timezone=True), default=now_brazil, onupdate=now_brazil)

    projects = relationship("ProjectModel", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("TaskModel", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettingsModel", back_populates="user", uselist=False, cascade="all, delete-orphan")


class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    color = Column(String(7))
    icon = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=now_brazil)
    updated_at = Column(DateTime(timezone=True), default=now_brazil, onupdate=now_brazil)

    user = relationship("UserModel", back_populates="projects")
    tasks = relationship("TaskModel", back_populates="project")


class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"))
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"))
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(String(20), default="todo", nullable=False)
    priority = Column(String(10), default="medium", nullable=False)
    due_date = Column(DateTime(timezone=True))
    estimated_duration = Column(Integer)
    actual_duration = Column(Integer)
    completed_at = Column(DateTime(timezone=True))
    tags = Column(ARRAY(Text))
    task_metadata = Column(JSONB, name="metadata")
    natural_language_input = Column(Text)
    gpt_response = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=now_brazil)
    updated_at = Column(DateTime(timezone=True), default=now_brazil, onupdate=now_brazil)

    user = relationship("UserModel", back_populates="tasks")
    project = relationship("ProjectModel", back_populates="tasks")
    subtasks = relationship("TaskModel", cascade="all, delete-orphan")


class UserSettingsModel(Base):
    __tablename__ = "user_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    llm_provider = Column(String(20), default="llama", nullable=False)
    openai_api_key = Column(Text)
    llama_endpoint = Column(String(255), default="http://localhost:11434")
    default_task_duration = Column(Integer, default=60)
    enable_auto_subtasks = Column(Boolean, default=False)
    enable_auto_priority = Column(Boolean, default=True)
    enable_auto_tags = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_brazil)
    updated_at = Column(DateTime(timezone=True), default=now_brazil, onupdate=now_brazil)

    user = relationship("UserModel", back_populates="settings")


class GPTCacheModel(Base):
    __tablename__ = "gpt_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    input_hash = Column(String(64), unique=True, nullable=False, index=True)
    input_text = Column(Text, nullable=False)
    output = Column(JSONB, nullable=False)
    model = Column(String(50))
    tokens_used = Column(Integer)
    cost = Column(Numeric(10, 6))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_accessed = Column(DateTime(timezone=True), default=datetime.utcnow)
    access_count = Column(Integer, default=1)
