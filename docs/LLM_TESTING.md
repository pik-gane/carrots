# LLM Testing Setup

Quick setup for testing LLM features with a lightweight, free, local model.

## Quick Start (One Command)

```bash
./scripts/setup-test-llm.sh
```

This script will:
1. Start Ollama in a Docker container
2. Download the Phi model (~1.6GB)
3. Configure everything automatically

## What You Get

- **Model**: Phi (Microsoft's 2.7B parameter model)
- **Size**: ~1.6GB download
- **Speed**: Fast inference, good for testing
- **Quality**: Surprisingly good for its size
- **Cost**: Completely free
- **Privacy**: Runs locally, no data sent externally

## Manual Setup

If you prefer to set things up manually:

### 1. Start Ollama Container

```bash
docker compose -f docker/docker-compose.llm-test.yml up -d
```

### 2. Verify It's Running

```bash
docker ps | grep ollama
curl http://localhost:11434/
```

### 3. Pull the Model

```bash
docker exec carrots-ollama-test ollama pull phi
```

### 4. Configure Backend

**For Docker Backend (recommended setup):**

Edit `.env` in the **project root** (not `backend/.env`):
```env
LLM_PROVIDER=ollama
LLM_MODEL=phi
OLLAMA_BASE_URL=http://host.docker.internal:11434
OPENAI_API_KEY=sk-placeholder
```

**Note for Linux users:** The `docker-compose.yml` includes `extra_hosts` configuration to enable `host.docker.internal` on Linux. If it still doesn't work, use:
```env
OLLAMA_BASE_URL=http://172.17.0.1:11434
```

**For local development (npm run dev):**

Edit `backend/.env`:
```env
LLM_PROVIDER="ollama"
LLM_MODEL="phi"
OLLAMA_BASE_URL="http://localhost:11434"
```

### 5. Restart Backend

```bash
# If using Docker
docker compose down
docker compose up -d

# If using npm run dev
cd backend
npm run dev
```

### 6. Test It

```bash
# Quick test via Ollama directly
docker exec carrots-ollama-test ollama run phi "Say hello"

# Or start your backend and test through the API
cd backend
npm run dev
```

## Available Models

The Phi model is recommended for testing, but you can use others:

### Ultra-lightweight (fastest)
```bash
docker exec carrots-ollama-test ollama pull tinyllama  # ~637MB
```

### Lightweight (good balance)
```bash
docker exec carrots-ollama-test ollama pull phi        # ~1.6GB (recommended)
docker exec carrots-ollama-test ollama pull gemma:2b  # ~1.4GB
```

### Medium (better quality)
```bash
docker exec carrots-ollama-test ollama pull llama2    # ~3.8GB
docker exec carrots-ollama-test ollama pull mistral   # ~4.1GB
```

To switch models, just update `LLM_MODEL` in your `.env` file.

## Testing Your Changes

### 1. Test Commitment Parsing

Start the frontend and backend, then:
1. Go to a group
2. Click "Create Commitment"
3. Use the "Parse with AI" feature
4. Try: "If Alice does 5 hours of coding, I will do 3 hours"

### 2. Test API Directly

```bash
# Get auth token first
TOKEN="your-jwt-token"

# Test parse endpoint
curl -X POST http://localhost:3001/api/commitments/parse \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "naturalLanguageText": "If Bob does 5 hours, I will do 3 hours",
    "groupId": "your-group-id"
  }'
```

### 3. Check Ollama Logs

```bash
docker logs carrots-ollama-test
```

## Troubleshooting

### Container Won't Start
```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :11434

# View logs
docker compose -f docker/docker-compose.llm-test.yml logs
```

### Model Download Fails
```bash
# Check internet connection
curl -I https://ollama.com

# Try pulling manually with more details
docker exec carrots-ollama-test ollama pull phi --verbose
```

### Parsing Quality Issues

The Phi model is good but not as powerful as GPT-4. For production:
- Use OpenAI (GPT-4) for best quality
- Use Anthropic (Claude) as alternative
- Use Phi/Llama2 for development/testing

### Performance Issues

If inference is slow:
```bash
# Try a smaller model
docker exec carrots-ollama-test ollama pull tinyllama

# Update .env
LLM_MODEL="tinyllama"
```

## Cleanup

### Stop Container (Keep Model)
```bash
docker compose -f docker/docker-compose.llm-test.yml down
```

### Remove Everything (Including Model)
```bash
docker compose -f docker/docker-compose.llm-test.yml down -v
```

### Just Remove the Model
```bash
docker exec carrots-ollama-test ollama rm phi
```

## Advanced Usage

### Use Multiple Models

Keep multiple models downloaded for different purposes:
```bash
docker exec carrots-ollama-test ollama pull phi      # For testing
docker exec carrots-ollama-test ollama pull llama2   # For better quality
docker exec carrots-ollama-test ollama pull codellama # For code-heavy commitments
```

Switch between them by changing `LLM_MODEL` in `.env`.

### Resource Limits

If you need to limit resources:

Edit `docker/docker-compose.llm-test.yml`:
```yaml
services:
  ollama:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

### Integration with Full Stack

The test LLM container works with the full docker-compose setup:

```bash
# Start everything including test LLM
docker compose -f docker-compose.yml -f docker/docker-compose.llm-test.yml up -d
```

## Comparison: Test vs Production

| Feature | Test (Phi) | Production (GPT-4) |
|---------|-----------|-------------------|
| Cost | Free | ~$0.01-0.03/request |
| Setup | 5 minutes | 1 minute (API key) |
| Privacy | Local | Cloud |
| Quality | Good | Excellent |
| Speed | Fast | Fast |
| Use Case | Development/Testing | Production |

## CI/CD Integration

You can use this in CI/CD for automated testing:

```yaml
# .github/workflows/test.yml
- name: Setup test LLM
  run: ./scripts/setup-test-llm.sh

- name: Run LLM integration tests
  env:
    LLM_PROVIDER: ollama
    LLM_MODEL: phi
    OLLAMA_BASE_URL: http://localhost:11434
  run: npm test
```

## Learn More

- [Ollama Docker Guide](https://github.com/ollama/ollama/blob/main/docs/docker.md)
- [Phi Model Info](https://ollama.com/library/phi)
- [Available Models](https://ollama.com/library)
- [Full LLM Integration Guide](./LLM_INTEGRATION.md)
