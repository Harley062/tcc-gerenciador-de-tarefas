from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"
