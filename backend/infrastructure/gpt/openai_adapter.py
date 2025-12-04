import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo

from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel, Field

logger = logging.getLogger("sgti")

BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")


class ParsedTaskSchema(BaseModel):
    title: str = Field(..., description="Concise task title")
    description: Optional[str] = Field(None, description="Detailed description")
    priority: str = Field("medium", description="Priority level: low, medium, high, urgent")
    due_date: Optional[str] = Field(None, description="ISO format datetime")
    estimated_duration: Optional[int] = Field(None, description="Estimated duration in minutes")
    tags: list[str] = Field(default_factory=list, description="Relevant tags")
    recurrence: Optional[dict] = Field(None, description="Recurrence pattern if task repeats")


class OpenAIAdapter:
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
        self.max_tokens_per_request = 500

    async def parse_task(self, text: str) -> dict[str, Any]:
        now_brazil = datetime.now(BRAZIL_TZ)
        current_date = now_brazil.strftime("%Y-%m-%d")
        current_time = now_brazil.strftime("%H:%M")
        
        system_prompt = f"""Você é um assistente de análise de tarefas. Extraia informações estruturadas de descrições de tarefas em linguagem natural.

Data atual: {current_date}
Hora atual: {current_time} (Horário de Brasília - America/Sao_Paulo)

Retorne um objeto JSON com os seguintes campos:
- title: string (título conciso da tarefa, obrigatório)
- description: string (descrição detalhada, opcional)
- priority: string (deve ser: low, medium, high ou urgent)
- due_date: string (formato ISO datetime COM timezone de Brasília -03:00, null se não mencionado. Exemplo: 2025-11-27T14:00:00-03:00)
- estimated_duration: integer (minutos, null se não mencionado)
- tags: array de strings (tags relevantes extraídas do contexto)
- recurrence: object (se a tarefa se repete: {{"frequency": "daily|weekly|monthly", "interval": 1}}, null caso contrário)

Exemplos:
Entrada: "Reunião com cliente amanhã às 14h"
Saída: {{"title": "Reunião com cliente", "description": "Reunião agendada com cliente", "priority": "medium", "due_date": "{current_date}T14:00:00-03:00", "estimated_duration": 60, "tags": ["reunião", "cliente"], "recurrence": null}}

Entrada: "planning toda semana"
Saída: {{"title": "Planning semanal", "description": "Reunião de planning recorrente", "priority": "medium", "due_date": null, "estimated_duration": 60, "tags": ["planning", "reunião"], "recurrence": {{"frequency": "weekly", "interval": 1}}}}

Entrada: "Urgente: Corrigir bug em produção no sistema de pagamento até o fim do dia"
Saída: {{"title": "Corrigir bug em produção no sistema de pagamento", "description": "Correção crítica de bug necessária no sistema de pagamento", "priority": "urgent", "due_date": "{current_date}T23:59:59-03:00", "estimated_duration": null, "tags": ["bug", "produção", "pagamento"], "recurrence": null}}

IMPORTANTE: Sempre use o timezone -03:00 (Brasília) para as datas.

Retorne apenas JSON válido seguindo o schema, sem texto adicional."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text},
                ],
                temperature=0.3,
                max_tokens=self.max_tokens_per_request,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from GPT")

            parsed = json.loads(content)
            validated = ParsedTaskSchema(**parsed)
            
            tokens_used = response.usage.total_tokens if response.usage else 0
            cost = self._calculate_cost(tokens_used)
            
            logger.info(
                "GPT task parsing completed",
                extra={
                    "model": self.model,
                    "tokens_used": tokens_used,
                    "cost": cost,
                    "input_length": len(text),
                },
            )
            
            return {
                "parsed_data": validated.model_dump(),
                "tokens_used": tokens_used,
                "model": self.model,
                "cost": cost,
            }

        except (OpenAIError, json.JSONDecodeError, Exception) as e:
            logger.error(
                "GPT parsing failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "input_text": text[:100],
                },
            )
            raise Exception(f"GPT parsing failed: {str(e)}")

    async def suggest_subtasks(self, task_title: str, task_description: Optional[str] = None) -> list[dict[str, Any]]:
        prompt = f"Tarefa: {task_title}"
        if task_description:
            prompt += f"\nDescrição: {task_description}"
        prompt += '\n\nSugira 3-5 subtarefas para completar esta tarefa. Retorne um objeto JSON com um array "subtasks". Cada subtarefa deve ter "title" (string), "description" (string) e "estimated_duration" (inteiro em minutos). IMPORTANTE: Todas as subtarefas devem estar em PORTUGUÊS BRASILEIRO.'

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": 'Você é um assistente de divisão de tarefas. Sugira subtarefas práticas em PORTUGUÊS BRASILEIRO. Retorne APENAS JSON válido neste formato: {"subtasks": [{"title": "...", "description": "...", "estimated_duration": 30}]}'},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                max_tokens=400,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from GPT-4")

            logger.info(
                "GPT subtask suggestion completed",
                extra={
                    "model": self.model,
                    "response_preview": content[:200],
                    "task_title": task_title[:50],
                }
            )

            result = json.loads(content)
            subtasks = result.get("subtasks", [])
            
            if not subtasks:
                raise ValueError("GPT-4 returned empty subtasks list")
            
            if not isinstance(subtasks, list):
                raise ValueError(f"GPT-4 returned invalid subtasks format: expected list, got {type(subtasks).__name__}")
            
            for idx, subtask in enumerate(subtasks):
                if not isinstance(subtask.get("estimated_duration"), int):
                    try:
                        subtasks[idx]["estimated_duration"] = int(subtask.get("estimated_duration", 30))
                    except (ValueError, TypeError):
                        subtasks[idx]["estimated_duration"] = 30
                
                if subtasks[idx]["estimated_duration"] <= 0:
                    subtasks[idx]["estimated_duration"] = 30
            
            return subtasks

        except (OpenAIError, json.JSONDecodeError) as e:
            logger.error(
                "GPT subtask suggestion failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "task_title": task_title[:50],
                }
            )
            raise Exception(f"Failed to generate subtasks with GPT-4: {str(e)}")

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        response_format: Optional[dict] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> dict[str, Any]:
        """Generate a general completion from GPT with configurable parameters"""
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            if response_format:
                kwargs["response_format"] = response_format

            response = await self.client.chat.completions.create(**kwargs)

            content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if response.usage else 0

            return {
                "content": content,
                "tokens_used": tokens_used,
                "model": self.model,
                "cost": self._calculate_cost(tokens_used),
            }
        except Exception as e:
            logger.error(f"GPT completion failed: {e}")
            raise

    def _calculate_cost(self, tokens: int) -> float:
        cost_per_1k_tokens = 0.03 if self.model == "gpt-4" else 0.002
        return (tokens / 1000) * cost_per_1k_tokens
