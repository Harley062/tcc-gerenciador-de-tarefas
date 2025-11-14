from datetime import datetime
from typing import Any
from uuid import uuid4

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


class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    projects = relationship("ProjectModel", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("TaskModel", back_populates="user", cascade="all, delete-orphan")


class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    color = Column(String(7))
    icon = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("UserModel", back_populates="tasks")
    project = relationship("ProjectModel", back_populates="tasks")
    subtasks = relationship("TaskModel", cascade="all, delete-orphan")


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
