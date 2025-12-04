from datetime import datetime
from typing import Any, Optional

from infrastructure.cache.redis_cache import RedisCache
from infrastructure.gpt.openai_adapter import OpenAIAdapter


class ParsedTask:
    def __init__(
        self,
        title: str,
        description: Optional[str] = None,
        priority: str = "medium",
        due_date: Optional[datetime] = None,
        estimated_duration: Optional[int] = None,
        tags: Optional[list[str]] = None,
        recurrence: Optional[dict] = None,
    ):
        self.title = title
        self.description = description
        self.priority = priority
        self.due_date = due_date
        self.estimated_duration = estimated_duration
        self.tags = tags or []
        self.recurrence = recurrence


class GPTService:
    def __init__(self, openai_adapter: OpenAIAdapter, cache: RedisCache):
        self.openai_adapter = openai_adapter
        self.cache = cache
        self.rate_limit_requests = 60
        self.rate_limit_tokens = 40000

    async def parse_task(self, text: str) -> tuple[ParsedTask, dict[str, Any]]:
        cache_key = f"gpt_parse:{RedisCache.generate_hash(text)}"

        cached_result = await self.cache.get(cache_key)
        if cached_result:
            cached_result["cache_hit"] = True
            return self._create_parsed_task(cached_result["parsed_data"]), cached_result

        result = await self.openai_adapter.parse_task(text)
        result["cache_hit"] = False
        await self.cache.set(cache_key, result)
        return self._create_parsed_task(result["parsed_data"]), result

    async def suggest_subtasks(self, task_title: str, task_description: Optional[str] = None) -> list[dict[str, Any]]:
        cache_key = f"gpt_subtasks:{RedisCache.generate_hash(task_title + (task_description or ''))}"
        
        cached_result = await self.cache.get(cache_key)
        if cached_result:
            return cached_result.get("subtasks", [])

        try:
            subtasks = await self.openai_adapter.suggest_subtasks(task_title, task_description)
            await self.cache.set(cache_key, {"subtasks": subtasks})
            return subtasks
        except Exception:
            return []

    def _create_parsed_task(self, data: dict[str, Any]) -> ParsedTask:
        due_date = None
        if data.get("due_date"):
            try:
                due_date = datetime.fromisoformat(data["due_date"].replace("Z", "+00:00"))
            except Exception:
                pass

        return ParsedTask(
            title=data.get("title", "Untitled Task"),
            description=data.get("description"),
            priority=data.get("priority", "medium"),
            due_date=due_date,
            estimated_duration=data.get("estimated_duration"),
            tags=data.get("tags", []),
            recurrence=data.get("recurrence"),
        )
