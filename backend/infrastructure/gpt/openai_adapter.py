import json
from typing import Any, Optional

from openai import AsyncOpenAI, OpenAIError


class OpenAIAdapter:
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def parse_task(self, text: str) -> dict[str, Any]:
        system_prompt = """You are a task parsing assistant. Extract structured information from natural language task descriptions.
        
Return a JSON object with these fields:
- title: string (concise task title)
- description: string (detailed description, optional)
- priority: string (low, medium, high, urgent)
- due_date: string (ISO format datetime, null if not mentioned)
- estimated_duration: integer (minutes, null if not mentioned)
- tags: array of strings (relevant tags)

Examples:
Input: "Reunião com cliente amanhã às 14h"
Output: {"title": "Reunião com cliente", "description": "Reunião agendada com cliente", "priority": "medium", "due_date": "2025-11-14T14:00:00", "estimated_duration": 60, "tags": ["reunião", "cliente"]}

Input: "Urgent: Fix production bug in payment system by end of day"
Output: {"title": "Fix production bug in payment system", "description": "Critical bug fix needed in payment system", "priority": "urgent", "due_date": "2025-11-13T23:59:59", "estimated_duration": null, "tags": ["bug", "production", "payment"]}

Only return valid JSON, no additional text."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text},
                ],
                temperature=0.3,
                max_tokens=500,
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from GPT")

            parsed = json.loads(content)
            
            return {
                "parsed_data": parsed,
                "tokens_used": response.usage.total_tokens if response.usage else 0,
                "model": self.model,
                "cost": self._calculate_cost(response.usage.total_tokens if response.usage else 0),
            }

        except (OpenAIError, json.JSONDecodeError, Exception) as e:
            raise Exception(f"GPT parsing failed: {str(e)}")

    async def suggest_subtasks(self, task_title: str, task_description: Optional[str] = None) -> list[dict[str, Any]]:
        prompt = f"Task: {task_title}"
        if task_description:
            prompt += f"\nDescription: {task_description}"
        prompt += "\n\nSuggest 3-5 subtasks to complete this task. Return as JSON array with objects containing 'title' and 'estimated_duration' (in minutes)."

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a task breakdown assistant. Suggest practical subtasks."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                max_tokens=400,
            )

            content = response.choices[0].message.content
            if not content:
                return []

            return json.loads(content)

        except Exception:
            return []

    def _calculate_cost(self, tokens: int) -> float:
        cost_per_1k_tokens = 0.03 if self.model == "gpt-4" else 0.002
        return (tokens / 1000) * cost_per_1k_tokens
