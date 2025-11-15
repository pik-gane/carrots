#!/bin/bash

# Script to quickly set up a lightweight LLM for testing
# Uses Ollama with the Phi model (small, fast, good quality)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Carrots LLM Test Setup"
echo "=========================="
echo ""
echo "This script will set up a lightweight LLM for testing using:"
echo "  - Ollama (containerized)"
echo "  - Phi model (~1.6GB, 2.7B parameters)"
echo ""
echo "Benefits:"
echo "  ✅ Completely free"
echo "  ✅ No API keys needed"
echo "  ✅ Fast inference"
echo "  ✅ Good quality for testing"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo "📦 Starting Ollama container..."
docker compose -f "$PROJECT_ROOT/docker/docker-compose.llm-test.yml" up -d ollama

echo ""
echo "⏳ Waiting for Ollama to be ready..."
sleep 5

# Wait for Ollama to be healthy
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker compose -f "$PROJECT_ROOT/docker/docker-compose.llm-test.yml" ps ollama | grep -q "healthy"; then
        echo "✅ Ollama is ready!"
        break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Error: Ollama failed to start"
        docker compose -f "$PROJECT_ROOT/docker/docker-compose.llm-test.yml" logs ollama
        exit 1
    fi
    sleep 2
    echo -n "."
done

echo ""
echo "⬇️  Downloading Phi model (this may take a few minutes)..."
docker exec carrots-ollama-test ollama pull phi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔧 Configure your backend/.env:"
echo "   LLM_PROVIDER=\"ollama\""
echo "   LLM_MODEL=\"phi\""
echo "   OLLAMA_BASE_URL=\"http://localhost:11434\""
echo ""
echo "📝 Quick test:"
echo "   docker exec carrots-ollama-test ollama run phi \"Say hello in one sentence\""
echo ""
echo "🛑 To stop:"
echo "   docker compose -f docker/docker-compose.llm-test.yml down"
echo ""
echo "🗑️  To remove (including downloaded model):"
echo "   docker compose -f docker/docker-compose.llm-test.yml down -v"
echo ""
