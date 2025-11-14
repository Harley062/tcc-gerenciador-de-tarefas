import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional, List, Dict

import httpx
from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger("taskmaster")


class ParsedTaskSchema(BaseModel):
    title: str = Field(..., description="Concise task title")
    description: Optional[str] = Field(None, description="Detailed description")
    priority: str = Field("medium", description="Priority level: low, medium, high, urgent")
    due_date: Optional[str] = Field(None, description="ISO format datetime")
    estimated_duration: Optional[int] = Field(None, description="Estimated duration in minutes")
    tags: List[str] = Field(default_factory=list, description="Relevant tags")
    recurrence: Optional[Dict[str, Any]] = Field(None, description="Recurrence pattern if task repeats")


class SubtaskSchema(BaseModel):
    """Schema para validar cada subtarefa individualmente."""
    title: str = Field(..., description="Concise subtask title, starting with an action verb")
    description: str = Field(..., description="One-sentence explanation of what to do or check")
    estimated_duration: int = Field(..., description="Estimated duration in minutes (e.g., 15, 30, 60)")


class LlamaAdapter:
    def __init__(self, endpoint: str | None = None, model: str = "llama2"):
        # Prefer explicit endpoint, then env var set by docker-compose, then sensible container default
        resolved = endpoint or os.getenv("OLLAMA_ENDPOINT") or "http://ollama:11434"
        self.endpoint = resolved.rstrip("/")
        self.model = model
        self.max_tokens = 1500 # Mantido, mas num_predict é usado por método
        logger.info(f"LlamaAdapter inicializado com endpoint: {self.endpoint} e modelo: {self.model}")

    async def parse_task(self, text: str) -> Dict[str, Any]:
        """
        Interpreta texto em linguagem natural e extrai dados estruturados de tarefa.
        """
        current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Prompt de sistema focado em apenas retornar o JSON
        system_prompt = f"""Você é um assistente de parsing de tarefas. Extraia informações estruturadas de descrições de tarefas em Português ou Inglês.

Data atual: {current_date}

Responda APENAS com um objeto JSON válido que siga este schema:
- title: string (título conciso, obrigatório)
- description: string (descrição detalhada, opcional)
- priority: string (deve ser um de: low, medium, high, urgent)
- due_date: string (datetime ISO com timezone, null se não mencionado)
- estimated_duration: integer (minutos, null se não mencionado)
- tags: array de strings (tags relevantes extraídas do contexto)
- recurrence: object (se a tarefa repetir: {{"frequency": "daily|weekly|monthly", "interval": 1}}, null caso contrário)

Exemplo de Input: "Reunião com cliente amanhã às 14h"
Exemplo de Output Esperado (não inclua no seu output): {{"title": "Reunião com cliente", "description": "Reunião agendada com cliente", "priority": "medium", "due_date": "{current_date}T14:00:00+00:00", "estimated_duration": 60, "tags": ["reunião", "cliente"], "recurrence": null}}
"""

        prompt = f"{system_prompt}\n\nInput do usuário: {text}\nJSON Output:"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.endpoint}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json", 
                        "options": {
                            "temperature": 0.6,
                            "num_predict": self.max_tokens,
                        },
                    },
                )
                response.raise_for_status()
                
                result = response.json()
                content = result.get("response", "").strip()
                
                if not content:
                    raise ValueError("Llama retornou uma resposta vazia")

                # MELHORIA: Parsing direto, sem 'find', pois o format=json garante
                parsed = json.loads(content)
                validated = ParsedTaskSchema(**parsed)
                
                logger.info(
                    "Llama task parsing completed",
                    extra={
                        "model": self.model,
                        "input_length": len(text),
                    },
                )
                
                return {
                    "parsed_data": validated.model_dump(),
                    "tokens_used": 0, # Tokens não são retornados por esta API
                    "model": self.model,
                    "cost": 0.0,
                }

        except (httpx.RequestError, json.JSONDecodeError, ValidationError) as e:
            logger.error(
                "Llama parsing failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "input_text": text[:100],
                    "endpoint": self.endpoint,
                    "raw_response": result.get("response", "") if 'result' in locals() else "N/A"
                },
            )
            raise Exception(f"Llama parsing failed: {str(e)}")
        except Exception as e:
            logger.error(
                "Llama parsing failed unexpectedly",
                extra={"error": str(e), "error_type": type(e).__name__},
            )
            raise Exception(f"Llama parsing failed: {str(e)}")

    async def suggest_subtasks(self, task_title: str, task_description: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Sugere subtarefas acionáveis para uma tarefa principal,
        com foco em "Preparação", "Execução" e "Verificação".
        """
        
        # --- MELHORIA CRÍTICA: PROMPT DE SISTEMA MAIS RIGOROSO ---
        system_context = """Você é um assistente especialista em planejamento de projetos. Seu trabalho é quebrar uma tarefa em 3 a 6 subtarefas lógicas, acionáveis e de alto valor.

Regras Estritas (Siga OBRIGATORIAMENTE):
1.  **Estrutura Lógica:** As subtarefas DEVEM seguir um fluxo de:
    1.  **Preparação:** O que precisa ser feito antes? (Ex: "Reunir requisitos", "Configurar ambiente").
    2.  **Execução:** A(s) etapa(s) principal(is) da tarefa. (Ex: "Codificar funcionalidade X", "Conduzir reunião").
    3.  **Verificação/Validação:** Como saber que terminou? (Ex: "Testar funcionalidade", "Revisar ata", "Validar deploy").
    4.  **Conclusão/Follow-up:** (Opcional) O que fazer depois? (Ex: "Enviar e-mail de resumo", "Fazer deploy").
2.  **Qualidade:** EVITE verbos genéricos como "Fazer", "Verificar", "Trabalhar". Use verbos de ação específicos (Ex: "Definir", "Implementar", "Testar", "Revisar", "Publicar").
3.  **Schema:** Retorne APENAS um array JSON. Cada objeto no array deve ter EXATAMENTE este schema:
    - `title`: string (Título curto e acionável. Ex: "Definir endpoints da API")
    - `description`: string (1 frase explicando o critério de aceite. Ex: "Documentar os 3 endpoints (GET, POST, PUT) no Swagger")
    - `estimated_duration`: integer (Duração em minutos. Use incrementos lógicos: 15, 30, 60, 90, 120, 240)
4.  **Idioma:** Responda no mesmo idioma da tarefa (Português ou Inglês).

Exemplo de Tarefa: "Deploy da versão 2.3"
Exemplo de Output JSON (NÃO inclua isso na sua resposta):
[
    {"title": "Revisar checklist de pré-deploy", "description": "Validar backups, notas de release e aprovação final", "estimated_duration": 30},
    {"title": "Executar deploy em Staging", "description": "Aplicar a versão em ambiente de homologação e rodar smoke tests", "estimated_duration": 45},
    {"title": "Executar deploy em Produção", "description": "Aplicar a versão no ambiente de produção na janela de manutenção", "estimated_duration": 60},
    {"title": "Monitorar logs e métricas pós-deploy", "description": "Verificar ativamente por erros (5xx) ou anomalias por 15 min", "estimated_duration": 15},
    {"title": "Comunicar conclusão do deploy", "description": "Enviar e-mail para stakeholders informando o sucesso da v2.3", "estimated_duration": 10}
]
"""

        prompt = f"{system_context}\n\nTarefa: {task_title}"
        if task_description:
            prompt += f"\nDescrição Adicional: {task_description}"
        prompt += "\n\nJSON Array de Subtarefas:"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.endpoint}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json", 
                        "options": {
                            "temperature": 0.6,  
                            "num_predict": 1600,
                        },
                    },
                )
                response.raise_for_status()

                result = response.json()
                content = result.get("response", "").strip()

                if not content:
                    logger.warning("Llama returned an empty response for subtasks")
                    return []

                # MELHORIA: Parsing direto e validação com Pydantic
                subtasks_raw = json.loads(content)
                
                if not isinstance(subtasks_raw, list):
                    logger.warning("Llama did not return a JSON array for subtasks", extra={"response": content})
                    return []

                validated_subtasks = []
                for i, sub_raw in enumerate(subtasks_raw):
                    try:
                        # Valida cada subtarefa contra o schema
                        validated = SubtaskSchema(**sub_raw)
                        validated_subtasks.append(validated.model_dump())
                    except ValidationError as val_err:
                        logger.warning(
                            f"Llama returned invalid subtask structure for item {i}",
                            extra={"error": str(val_err), "data": sub_raw}
                        )
                        # Tenta adicionar mesmo com falha, se tiver pelo menos um título
                        if isinstance(sub_raw, dict) and "title" in sub_raw:
                            validated_subtasks.append({
                                "title": sub_raw.get("title", "Subtarefa inválida"),
                                "description": sub_raw.get("description", "Descrição não fornecida"),
                                "estimated_duration": sub_raw.get("estimated_duration", 30)
                            })
                
                logger.info(
                    "Llama subtask suggestion completed",
                    extra={
                        "model": self.model,
                        "subtasks_count": len(validated_subtasks),
                        "task_title": task_title[:50],
                    },
                )

                return validated_subtasks

        except (httpx.RequestError, json.JSONDecodeError, ValidationError) as e:
            logger.error(
                "Llama subtask suggestion failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "task_title": task_title[:50],
                    "raw_response": result.get("response", "") if 'result' in locals() else "N/A"
                },
            )
            return []
        except Exception as e:
            logger.error(
                "Llama subtask suggestion failed unexpectedly",
                extra={"error": str(e), "error_type": type(e).__name__},
            )
            return []