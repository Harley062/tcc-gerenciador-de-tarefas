import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from application.services.gpt_service import GPTService, ParsedTask
from infrastructure.cache.redis_cache import RedisCache
from infrastructure.gpt.openai_adapter import OpenAIAdapter


@pytest.fixture
def mock_cache():
    cache = MagicMock(spec=RedisCache)
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()
    cache.generate_hash = MagicMock(return_value="test_hash")
    return cache


@pytest.fixture
def mock_openai_adapter():
    adapter = MagicMock(spec=OpenAIAdapter)
    adapter.parse_task = AsyncMock(return_value={
        "parsed_data": {
            "title": "Test Task",
            "description": "Test Description",
            "priority": "medium",
            "due_date": None,
            "estimated_duration": None,
            "tags": ["test"],
        },
        "tokens_used": 100,
        "model": "gpt-4",
        "cost": 0.003,
    })
    return adapter


@pytest.fixture
def gpt_service(mock_openai_adapter, mock_cache):
    return GPTService(mock_openai_adapter, mock_cache)


@pytest.mark.asyncio
async def test_parse_task_with_cache_hit(gpt_service, mock_cache):
    cached_result = {
        "parsed_data": {
            "title": "Cached Task",
            "description": "From cache",
            "priority": "high",
            "due_date": None,
            "estimated_duration": 60,
            "tags": ["cached"],
        },
        "source": "cache",
    }
    mock_cache.get = AsyncMock(return_value=cached_result)

    parsed_task, metadata = await gpt_service.parse_task("test input")

    assert isinstance(parsed_task, ParsedTask)
    assert parsed_task.title == "Cached Task"
    assert metadata == cached_result
    mock_cache.get.assert_called_once()


@pytest.mark.asyncio
async def test_parse_task_with_gpt_call(gpt_service, mock_cache, mock_openai_adapter):
    mock_cache.get = AsyncMock(return_value=None)

    parsed_task, metadata = await gpt_service.parse_task("test input")

    assert isinstance(parsed_task, ParsedTask)
    assert parsed_task.title == "Test Task"
    assert metadata["tokens_used"] == 100
    mock_openai_adapter.parse_task.assert_called_once_with("test input")
    mock_cache.set.assert_called_once()


@pytest.mark.asyncio
async def test_parse_task_fallback_on_error(gpt_service, mock_cache, mock_openai_adapter):
    mock_cache.get = AsyncMock(return_value=None)
    mock_openai_adapter.parse_task = AsyncMock(side_effect=Exception("API Error"))

    parsed_task, metadata = await gpt_service.parse_task("Urgent: Fix bug tomorrow at 14h")

    assert isinstance(parsed_task, ParsedTask)
    assert "Urgent: Fix bug tomorrow at 14h" in parsed_task.title
    assert metadata["source"] == "fallback"
    assert "error" in metadata


@pytest.mark.asyncio
async def test_fallback_parser_extracts_priority(gpt_service):
    parsed_task = gpt_service._fallback_parser("Urgent task to complete")
    assert parsed_task.priority == "urgent"

    parsed_task = gpt_service._fallback_parser("High priority item")
    assert parsed_task.priority == "high"

    parsed_task = gpt_service._fallback_parser("Low priority task")
    assert parsed_task.priority == "low"


@pytest.mark.asyncio
async def test_fallback_parser_extracts_tags(gpt_service):
    parsed_task = gpt_service._fallback_parser("Fix bug in production")
    assert "bug" in parsed_task.tags

    parsed_task = gpt_service._fallback_parser("Meeting with client")
    assert "reunião" in parsed_task.tags


@pytest.mark.asyncio
async def test_suggest_subtasks(gpt_service, mock_openai_adapter):
    mock_openai_adapter.suggest_subtasks = AsyncMock(return_value=[
        {"title": "Subtask 1", "estimated_duration": 30},
        {"title": "Subtask 2", "estimated_duration": 45},
    ])

    subtasks = await gpt_service.suggest_subtasks("Main Task", "Description")

    assert len(subtasks) == 2
    assert subtasks[0]["title"] == "Subtask 1"
    mock_openai_adapter.suggest_subtasks.assert_called_once()
