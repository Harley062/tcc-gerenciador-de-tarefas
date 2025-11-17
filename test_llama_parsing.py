#!/usr/bin/env python3
"""Test script to verify Llama task parsing functionality"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, '/app')

from infrastructure.llm.llama_adapter import LlamaAdapter


async def test_llama_parsing():
    """Test Llama task parsing with natural language input"""

    # Initialize Llama adapter
    llama_adapter = LlamaAdapter(endpoint="http://localhost:11434", model="llama2")

    # Test cases - natural language task descriptions
    test_cases = [
        "Reunião com cliente amanhã às 14h urgente",
        "Desenvolver API REST para autenticação com prazo para sexta-feira prioridade alta",
        "Comprar café tags: compras prioridade: baixa"
    ]

    print("="*80)
    print("TESTE DE PARSING DE TAREFAS COM LLAMA2")
    print("="*80)
    print()

    for i, task_text in enumerate(test_cases, 1):
        print(f"\n{'='*80}")
        print(f"TESTE {i}: {task_text}")
        print(f"{'='*80}")

        try:
            result = await llama_adapter.parse_task(task_text)

            print(f"\n✅ Parsing bem-sucedido!")
            print(f"\nResultado:")
            print(f"  Model: {result.get('model', 'N/A')}")
            print(f"  Tokens: {result.get('tokens_used', 'N/A')}")
            print(f"\nParsed Data:")
            parsed = result.get('parsed_data', {})
            print(f"  Title: {parsed.get('title', 'N/A')}")
            print(f"  Description: {parsed.get('description', 'N/A')}")
            print(f"  Priority: {parsed.get('priority', 'N/A')}")
            print(f"  Due Date: {parsed.get('due_date', 'N/A')}")
            print(f"  Tags: {parsed.get('tags', [])}")
            print(f"  Estimated Duration: {parsed.get('estimated_duration', 'N/A')}")

        except Exception as e:
            print(f"\n❌ Erro no parsing: {str(e)}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*80}")
    print("TESTE CONCLUÍDO")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    asyncio.run(test_llama_parsing())
