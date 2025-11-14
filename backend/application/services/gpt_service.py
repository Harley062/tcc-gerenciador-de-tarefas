import re
from datetime import datetime, timedelta
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
            return self._create_parsed_task(cached_result["parsed_data"]), cached_result

        try:
            result = await self.openai_adapter.parse_task(text)
            await self.cache.set(cache_key, result)
            return self._create_parsed_task(result["parsed_data"]), result
        except Exception as e:
            fallback_result = self._fallback_parser(text)
            return fallback_result, {"source": "fallback", "error": str(e)}

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

    def _fallback_parser(self, text: str) -> ParsedTask:
        title = text[:100] if len(text) > 100 else text
        
        priority = "medium"
        if re.search(r'\b(urgent|urgente|critical|crítico)\b', text, re.IGNORECASE):
            priority = "urgent"
        elif re.search(r'\b(high|alto|importante|important)\b', text, re.IGNORECASE):
            priority = "high"
        elif re.search(r'\b(low|baixo)\b', text, re.IGNORECASE):
            priority = "low"

        due_date = None
        tomorrow_match = re.search(r'\b(tomorrow|amanhã)\b', text, re.IGNORECASE)
        if tomorrow_match:
            due_date = datetime.now() + timedelta(days=1)
            time_match = re.search(r'(\d{1,2}):(\d{2})', text)
            if time_match:
                hour, minute = int(time_match.group(1)), int(time_match.group(2))
                due_date = due_date.replace(hour=hour, minute=minute, second=0, microsecond=0)

        today_match = re.search(r'\b(today|hoje)\b', text, re.IGNORECASE)
        if today_match:
            due_date = datetime.now()
            time_match = re.search(r'(\d{1,2}):(\d{2})', text)
            if time_match:
                hour, minute = int(time_match.group(1)), int(time_match.group(2))
                due_date = due_date.replace(hour=hour, minute=minute, second=0, microsecond=0)

        tags = []
        if re.search(r'\b(meeting|reunião)\b', text, re.IGNORECASE):
            tags.append("reunião")
        if re.search(r'\b(bug|erro|error)\b', text, re.IGNORECASE):
            tags.append("bug")
        if re.search(r'\b(feature|funcionalidade)\b', text, re.IGNORECASE):
            tags.append("feature")

        return ParsedTask(
            title=title,
            description=text if len(text) > 100 else None,
            priority=priority,
            due_date=due_date,
            tags=tags,
        )
