import logging
from typing import Any, Optional
from uuid import UUID

from application.services.gpt_service import GPTService
from infrastructure.gpt.openai_adapter import OpenAIAdapter
from infrastructure.llm.llama_adapter import LlamaAdapter
from infrastructure.llm.regex_parser import RegexParser

logger = logging.getLogger("taskmaster")


class EnhancedGPTService(GPTService):
    """Enhanced GPT service that supports multiple LLM providers"""
    
    def __init__(
        self,
        openai_adapter: Optional[OpenAIAdapter] = None,
        llama_adapter: Optional[LlamaAdapter] = None,
        regex_parser: Optional[RegexParser] = None,
        cache_repository=None,
    ):
        # Initialize parent with openai_adapter for backward compatibility
        super().__init__(openai_adapter, cache_repository)
        self.llama_adapter = llama_adapter or LlamaAdapter()
        self.regex_parser = regex_parser or RegexParser()
        self.current_provider = "regex"  # Default to regex (always works)
    
    def set_provider(self, provider: str, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        """Set the LLM provider to use"""
        self.current_provider = provider
        
        if provider == "gpt4" and api_key:
            self.gpt_adapter = OpenAIAdapter(api_key=api_key)
        elif provider == "llama" and endpoint:
            self.llama_adapter = LlamaAdapter(endpoint=endpoint)
    
    async def parse_task(self, text: str) -> tuple[Any, dict[str, Any]]:
        """Parse task using the configured LLM provider with fallback"""
        
        # Try the configured provider first
        try:
            if self.current_provider == "gpt4" and self.gpt_adapter:
                logger.info(f"Parsing task with GPT-4: {text[:50]}...")
                result = await self._parse_with_gpt(text)
            elif self.current_provider == "llama":
                logger.info(f"Parsing task with Llama: {text[:50]}...")
                result = await self.llama_adapter.parse_task(text)
            else:
                logger.info(f"Parsing task with Regex: {text[:50]}...")
                result = await self.regex_parser.parse_task(text)
            
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
                f"Primary parser ({self.current_provider}) failed, falling back to regex",
                extra={"error": str(e), "provider": self.current_provider}
            )
            # Fallback to regex parser
            result = await self.regex_parser.parse_task(text)
            parsed_data = result["parsed_data"]
            gpt_response = {
                "tokens_used": 0,
                "model": "regex_fallback",
                "cost": 0.0,
                "fallback_reason": str(e),
            }
            
            from application.services.gpt_service import ParsedTask
            parsed_task = ParsedTask(**parsed_data)
            
            return parsed_task, gpt_response
    
    async def _parse_with_gpt(self, text: str) -> dict[str, Any]:
        """Parse with GPT using cache"""
        if self.cache_repository:
            cached = await self.cache_repository.get_cached_response(text)
            if cached:
                logger.info("Cache hit for GPT parsing")
                return {
                    "parsed_data": cached["output"]["parsed_data"],
                    "tokens_used": cached.get("tokens_used", 0),
                    "model": cached.get("model", "gpt-4"),
                    "cost": float(cached.get("cost", 0.0)),
                }
        
        result = await self.gpt_adapter.parse_task(text)
        
        if self.cache_repository:
            await self.cache_repository.cache_response(
                input_text=text,
                output=result,
                model=result.get("model", "gpt-4"),
                tokens_used=result.get("tokens_used", 0),
                cost=result.get("cost", 0.0),
            )
        
        return result
    
    async def suggest_subtasks(self, task_title: str, task_description: Optional[str] = None) -> list[dict[str, Any]]:
        """Suggest subtasks using the configured provider"""
        try:
            if self.current_provider == "gpt4" and self.gpt_adapter:
                return await self.gpt_adapter.suggest_subtasks(task_title, task_description)
            elif self.current_provider == "llama":
                return await self.llama_adapter.suggest_subtasks(task_title, task_description)
            else:
                # Regex parser doesn't support subtasks
                return []
        except Exception as e:
            logger.error(f"Subtask suggestion failed: {e}")
            return []
