import logging
from typing import Any, Optional
from uuid import UUID

from application.services.gpt_service import GPTService
from infrastructure.gpt.openai_adapter import OpenAIAdapter
from infrastructure.llm.llama_adapter import LlamaAdapter

logger = logging.getLogger("taskmaster")


class EnhancedGPTService(GPTService):
    """Enhanced GPT service that supports multiple LLM providers"""
    
    def __init__(
        self,
        openai_adapter: Optional[OpenAIAdapter] = None,
        llama_adapter: Optional[LlamaAdapter] = None,
        cache_repository=None,
    ):
        # Initialize parent with openai_adapter for backward compatibility
        super().__init__(openai_adapter, cache_repository)
        self.llama_adapter = llama_adapter or LlamaAdapter()
        self.current_provider = "llama"
    
    def set_provider(self, provider: str, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        """Set the LLM provider to use"""
        self.current_provider = provider

        if provider == "gpt4" and api_key:
            self.openai_adapter = OpenAIAdapter(api_key=api_key)
        elif provider == "llama" and endpoint:
            self.llama_adapter = LlamaAdapter(endpoint=endpoint)

    async def parse_task(self, text: str) -> tuple[Any, dict[str, Any]]:
        """Parse task using the configured LLM provider with fallback"""

        # Try the configured provider first
        try:
            if self.current_provider == "gpt4" and self.openai_adapter:
                logger.info(f"Parsing task with GPT-4: {text[:50]}...")
                result = await self._parse_with_gpt(text)
            elif self.current_provider == "llama":
                logger.info(f"Parsing task with Llama: {text[:50]}...")
                result = await self.llama_adapter.parse_task(text)
            else:
                # If provider unknown, attempt Llama then GPT
                logger.info(f"Parsing task with fallback chain: {text[:50]}...")
                try:
                    result = await self.llama_adapter.parse_task(text)
                except Exception:
                    result = await self._parse_with_gpt(text)
            
            parsed_data = result["parsed_data"]
            gpt_response = {
                "tokens_used": result.get("tokens_used", 0),
                "model": result.get("model", self.current_provider),
                "cost": result.get("cost", 0.0),
            }
            
            # Convert to ParsedTask object
            from application.services.gpt_service import ParsedTask
            parsed_task = ParsedTask(**parsed_data)
            
            return parsed_task, gpt_response
            
        except Exception as e:
            logger.warning(
                f"Primary parser ({self.current_provider}) failed, attempting alternate providers",
                extra={"error": str(e), "provider": self.current_provider}
            )
            # Try alternate provider(s)
            try:
                if self.current_provider == "gpt4" and self.llama_adapter:
                    result = await self.llama_adapter.parse_task(text)
                elif self.current_provider == "llama" and self.openai_adapter:
                    result = await self._parse_with_gpt(text)
                elif self.openai_adapter:
                    # last-resort: try GPT adapter if available
                    result = await self._parse_with_gpt(text)
                else:
                    # No fallback available, re-raise the original error
                    logger.error(
                        f"No fallback provider available. Provider: {self.current_provider}, "
                        f"OpenAI available: {self.openai_adapter is not None}, "
                        f"Llama available: {self.llama_adapter is not None}"
                    )
                    raise e

                parsed_data = result["parsed_data"]
                gpt_response = {
                    "tokens_used": result.get("tokens_used", 0),
                    "model": result.get("model", self.current_provider),
                    "cost": result.get("cost", 0.0),
                    "fallback_reason": str(e),
                }

                from application.services.gpt_service import ParsedTask
                parsed_task = ParsedTask(**parsed_data)
                return parsed_task, gpt_response
            except Exception as final_e:
                logger.error("All parsers failed", extra={"error": str(final_e)})
                raise final_e
    
    async def _parse_with_gpt(self, text: str) -> dict[str, Any]:
        """Parse with GPT using cache"""
        cache_key = f"gpt_parse:{text[:50]}"

        if self.cache:
            cached = await self.cache.get(cache_key)
            if cached:
                logger.info("Cache hit for GPT parsing")
                return cached

        result = await self.openai_adapter.parse_task(text)

        if self.cache:
            await self.cache.set(cache_key, result)

        return result
    
    async def suggest_subtasks(self, task_title: str, task_description: Optional[str] = None) -> list[dict[str, Any]]:
        """Suggest subtasks using the configured provider"""
        try:
            if self.current_provider == "gpt4" and self.openai_adapter:
                return await self.openai_adapter.suggest_subtasks(task_title, task_description)
            elif self.current_provider == "llama":
                return await self.llama_adapter.suggest_subtasks(task_title, task_description)
            else:
                # Unknown provider: try Llama then GPT
                try:
                    return await self.llama_adapter.suggest_subtasks(task_title, task_description)
                except Exception:
                    if self.openai_adapter:
                        return await self.openai_adapter.suggest_subtasks(task_title, task_description)
                    return []
        except Exception as e:
            logger.error(f"Subtask suggestion failed: {e}")
            return []
