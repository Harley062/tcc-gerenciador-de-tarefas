#!/usr/bin/env python3
"""Test Llama integration using environment variables"""
import asyncio
import sys
import os

sys.path.insert(0, '/app')

from infrastructure.llm.llama_adapter import LlamaAdapter


async def test_integration():
    """Test Llama integration with environment-configured endpoint"""

    # Get endpoint from environment (same as the application does)
    endpoint = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434")

    print(f"Testing Llama integration...")
    print(f"Endpoint: {endpoint}")
    print(f"=" * 80)

    llama_adapter = LlamaAdapter(endpoint=endpoint, model="llama2")

    test_text = "Reunião com cliente amanhã às 14h urgente"

    print(f"\nTesting task parsing: '{test_text}'")
    print("-" * 80)

    try:
        result = await llama_adapter.parse_task(test_text)

        print("\n✅ SUCCESS! Llama is working!\n")
        print(f"Parsed Data:")
        parsed = result.get('parsed_data', {})
        print(f"  Title: {parsed.get('title')}")
        print(f"  Priority: {parsed.get('priority')}")
        print(f"  Due Date: {parsed.get('due_date')}")
        print(f"  Tags: {parsed.get('tags')}")

        print(f"\n{' ' * 80}")
        print("=" * 80)
        print("INTEGRATION TEST PASSED - LLAMA IS CONNECTED!")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ FAILED: {str(e)[:200]}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_integration())
