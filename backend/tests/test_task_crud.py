import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from application.use_cases.create_task import CreateTaskUseCase
from application.use_cases.manage_tasks import (
    GetTasksUseCase,
    GetTaskByIdUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
)
from domain.entities.task import Task
from domain.repositories.task_repository import TaskRepository
from domain.value_objects.priority import Priority
from domain.value_objects.task_status import TaskStatus


@pytest.fixture
def mock_task_repository():
    repo = MagicMock(spec=TaskRepository)
    repo.create = AsyncMock()
    repo.get_by_id = AsyncMock()
    repo.get_by_user_id = AsyncMock()
    repo.update = AsyncMock()
    repo.delete = AsyncMock()
    return repo


@pytest.mark.asyncio
async def test_create_task_structured(mock_task_repository):
    mock_gpt_service = MagicMock()
    use_case = CreateTaskUseCase(mock_task_repository, mock_gpt_service)
    
    user_id = uuid4()
    test_task = Task(
        user_id=user_id,
        title="Test Task",
        description="Test Description",
        priority=Priority.HIGH,
        status=TaskStatus.TODO,
    )
    mock_task_repository.create = AsyncMock(return_value=test_task)

    task = await use_case.execute_structured(
        user_id=user_id,
        title="Test Task",
        description="Test Description",
        priority=Priority.HIGH,
    )

    assert task.title == "Test Task"
    assert task.priority == Priority.HIGH
    mock_task_repository.create.assert_called_once()


@pytest.mark.asyncio
async def test_get_tasks_by_user(mock_task_repository):
    use_case = GetTasksUseCase(mock_task_repository)
    
    user_id = uuid4()
    test_tasks = [
        Task(user_id=user_id, title="Task 1", status=TaskStatus.TODO),
        Task(user_id=user_id, title="Task 2", status=TaskStatus.TODO),
    ]
    mock_task_repository.get_by_user_id = AsyncMock(return_value=test_tasks)

    tasks = await use_case.execute(user_id=user_id)

    assert len(tasks) == 2
    assert tasks[0].title == "Task 1"
    mock_task_repository.get_by_user_id.assert_called_once_with(user_id, None, None)


@pytest.mark.asyncio
async def test_get_tasks_with_status_filter(mock_task_repository):
    use_case = GetTasksUseCase(mock_task_repository)
    
    user_id = uuid4()
    test_tasks = [
        Task(user_id=user_id, title="Task 1", status=TaskStatus.DONE),
    ]
    mock_task_repository.get_by_user_id = AsyncMock(return_value=test_tasks)

    tasks = await use_case.execute(user_id=user_id, status=TaskStatus.DONE)

    assert len(tasks) == 1
    assert tasks[0].status == TaskStatus.DONE
    mock_task_repository.get_by_user_id.assert_called_once_with(user_id, TaskStatus.DONE, None)


@pytest.mark.asyncio
async def test_get_task_by_id_success(mock_task_repository):
    use_case = GetTaskByIdUseCase(mock_task_repository)
    
    user_id = uuid4()
    task_id = uuid4()
    test_task = Task(id=task_id, user_id=user_id, title="Test Task")
    mock_task_repository.get_by_id = AsyncMock(return_value=test_task)

    task = await use_case.execute(task_id=task_id, user_id=user_id)

    assert task is not None
    assert task.id == task_id
    assert task.title == "Test Task"


@pytest.mark.asyncio
async def test_get_task_by_id_wrong_user(mock_task_repository):
    use_case = GetTaskByIdUseCase(mock_task_repository)
    
    user_id = uuid4()
    other_user_id = uuid4()
    task_id = uuid4()
    test_task = Task(id=task_id, user_id=other_user_id, title="Test Task")
    mock_task_repository.get_by_id = AsyncMock(return_value=test_task)

    task = await use_case.execute(task_id=task_id, user_id=user_id)

    assert task is None


@pytest.mark.asyncio
async def test_update_task_success(mock_task_repository):
    use_case = UpdateTaskUseCase(mock_task_repository)
    
    user_id = uuid4()
    task_id = uuid4()
    original_task = Task(id=task_id, user_id=user_id, title="Original Title", status=TaskStatus.TODO)
    updated_task = Task(id=task_id, user_id=user_id, title="Updated Title", status=TaskStatus.IN_PROGRESS)
    
    mock_task_repository.get_by_id = AsyncMock(return_value=original_task)
    mock_task_repository.update = AsyncMock(return_value=updated_task)

    task = await use_case.execute(
        task_id=task_id,
        user_id=user_id,
        title="Updated Title",
        status=TaskStatus.IN_PROGRESS,
    )

    assert task is not None
    assert task.title == "Updated Title"
    assert task.status == TaskStatus.IN_PROGRESS
    mock_task_repository.update.assert_called_once()


@pytest.mark.asyncio
async def test_update_task_marks_completed(mock_task_repository):
    use_case = UpdateTaskUseCase(mock_task_repository)
    
    user_id = uuid4()
    task_id = uuid4()
    original_task = Task(id=task_id, user_id=user_id, title="Task", status=TaskStatus.IN_PROGRESS)
    
    mock_task_repository.get_by_id = AsyncMock(return_value=original_task)
    mock_task_repository.update = AsyncMock(return_value=original_task)

    await use_case.execute(
        task_id=task_id,
        user_id=user_id,
        status=TaskStatus.DONE,
    )

    assert original_task.completed_at is not None


@pytest.mark.asyncio
async def test_delete_task_success(mock_task_repository):
    use_case = DeleteTaskUseCase(mock_task_repository)
    
    user_id = uuid4()
    task_id = uuid4()
    test_task = Task(id=task_id, user_id=user_id, title="Test Task")
    
    mock_task_repository.get_by_id = AsyncMock(return_value=test_task)
    mock_task_repository.delete = AsyncMock(return_value=True)

    result = await use_case.execute(task_id=task_id, user_id=user_id)

    assert result is True
    mock_task_repository.delete.assert_called_once_with(task_id)


@pytest.mark.asyncio
async def test_delete_task_wrong_user(mock_task_repository):
    use_case = DeleteTaskUseCase(mock_task_repository)
    
    user_id = uuid4()
    other_user_id = uuid4()
    task_id = uuid4()
    test_task = Task(id=task_id, user_id=other_user_id, title="Test Task")
    
    mock_task_repository.get_by_id = AsyncMock(return_value=test_task)

    result = await use_case.execute(task_id=task_id, user_id=user_id)

    assert result is False
    mock_task_repository.delete.assert_not_called()
