import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger("taskmaster")


class ParsedTaskSchema(BaseModel):
    title: str = Field(..., description="Concise task title")
    description: Optional[str] = Field(None, description="Detailed description")
    priority: str = Field("medium", description="Priority level: low, medium, high, urgent")
    due_date: Optional[str] = Field(None, description="ISO format datetime")
    estimated_duration: Optional[int] = Field(None, description="Estimated duration in minutes")
    tags: list[str] = Field(default_factory=list, description="Relevant tags")
    recurrence: Optional[dict] = Field(None, description="Recurrence pattern if task repeats")


class LlamaAdapter:
    def __init__(self, endpoint: str = "http://localhost:11434", model: str = "llama2"):
        self.endpoint = endpoint.rstrip("/")
        self.model = model
        self.max_tokens = 500

    async def parse_task(self, text: str) -> dict[str, Any]:
        current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        system_prompt = f"""You are a task parsing assistant. Extract structured information from natural language task descriptions in Portuguese or English.

Current date: {current_date}

Return ONLY a JSON object with these fields:
- title: string (concise task title, required)
- description: string (detailed description, optional)
- priority: string (must be one of: low, medium, high, urgent)
- due_date: string (ISO format datetime with timezone, null if not mentioned)
- estimated_duration: integer (minutes, null if not mentioned)
- tags: array of strings (relevant tags extracted from context)
- recurrence: object (if task repeats: {{"frequency": "daily|weekly|monthly", "interval": 1}}, null otherwise)

Examples:
Input: "Reunião com cliente amanhã às 14h"
Output: {{"title": "Reunião com cliente", "description": "Reunião agendada com cliente", "priority": "medium", "due_date": "{current_date}T14:00:00+00:00", "estimated_duration": 60, "tags": ["reunião", "cliente"], "recurrence": null}}

Input: "planning toda semana"
Output: {{"title": "Planning semanal", "description": "Reunião de planning recorrente", "priority": "medium", "due_date": null, "estimated_duration": 60, "tags": ["planning", "reunião"], "recurrence": {{"frequency": "weekly", "interval": 1}}}}

Only return valid JSON, no additional text."""

        prompt = f"{system_prompt}\n\nInput: {text}\nOutput:"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.endpoint}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.3,
                            "num_predict": self.max_tokens,
                        },
                    },
                )
                response.raise_for_status()
                
                result = response.json()
                content = result.get("response", "")
                
                # Extract JSON from response
                json_start = content.find("{")
                json_end = content.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    parsed = json.loads(json_str)
                    validated = ParsedTaskSchema(**parsed)
                    
                    logger.info(
                        "Llama task parsing completed",
                        extra={
                            "model": self.model,
                            "endpoint": self.endpoint,
                            "input_length": len(text),
                        },
                    )
                    
                    return {
                        "parsed_data": validated.model_dump(),
                        "tokens_used": 0,
                        "model": self.model,
                        "cost": 0.0,
                    }
                else:
                    raise ValueError("No valid JSON found in Llama response")

        except Exception as e:
            logger.error(
                "Llama parsing failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "input_text": text[:100],
                    "endpoint": self.endpoint,
                },
            )
            raise Exception(f"Llama parsing failed: {str(e)}")

    async def suggest_subtasks(self, task_title: str, task_description: Optional[str] = None) -> list[dict[str, Any]]:
        prompt = f"Task: {task_title}"
        if task_description:
            prompt += f"\nDescription: {task_description}"
        prompt += "\n\nSuggest 3-5 practical subtasks to complete this task. Return as JSON array with objects containing 'title' and 'estimated_duration' (in minutes). Only return the JSON array, no additional text."

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.endpoint}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.5,
                            "num_predict": 400,
                        },
                    },
                )
                response.raise_for_status()
                
                result = response.json()
                content = result.get("response", "")
                
                # Extract JSON array
                json_start = content.find("[")
                json_end = content.rfind("]") + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    return json.loads(json_str)
                
                return []

        except Exception:
            return []
