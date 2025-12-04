from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: Optional[str]


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class CreateTaskNaturalLanguageRequest(BaseModel):
    natural_language_input: str
    project_id: Optional[UUID] = None


class CreateTaskStructuredRequest(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None
    tags: Optional[list[str]] = None
    project_id: Optional[UUID] = None
    parent_task_id: Optional[UUID] = None


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None
    actual_duration: Optional[int] = None
    tags: Optional[list[str]] = None
    project_id: Optional[UUID] = None


class TaskResponse(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str]
    parent_task_id: Optional[str]
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[str]
    estimated_duration: Optional[int]
    actual_duration: Optional[int]
    completed_at: Optional[str]
    tags: list[str]
    metadata: dict[str, Any]
    natural_language_input: Optional[str]
    gpt_response: Optional[dict[str, Any]]
    created_at: Optional[str]
    updated_at: Optional[str]


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int


class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    color: Optional[str]
    icon: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
