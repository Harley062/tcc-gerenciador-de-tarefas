#!/bin/bash
set -e

echo "🚀 Initializing Ollama..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service to start..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  echo "   Ollama not ready yet, waiting..."
  sleep 3
done

echo "✅ Ollama service is ready!"

# Check if llama2 model is already installed
if curl -s http://localhost:11434/api/tags | grep -q "llama2"; then
  echo "✅ Llama2 model already installed"
else
  echo "📥 Downloading llama2 model (this may take a few minutes, ~4GB)..."
  curl -X POST http://localhost:11434/api/pull -d '{"name": "llama2"}' &
  PULL_PID=$!
  
  # Show progress
  while kill -0 $PULL_PID 2>/dev/null; do
    echo "   Still downloading llama2..."
    sleep 10
  done
  
  echo "✅ Llama2 model downloaded successfully!"
fi

echo "🎉 Ollama initialization complete!"
echo "📍 Ollama is available at http://localhost:11434"
