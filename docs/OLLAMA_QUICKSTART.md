# Quick Start: Using Local LLMs with Ollama

Want to use the LLM-powered commitment parsing **completely free and private**? This guide shows you how to set up Ollama for local LLM inference.

## Why Ollama?

- ✅ **Completely free** - no API costs ever
- ✅ **Private** - your data never leaves your machine
- ✅ **Fast** - no network latency
- ✅ **Works offline** - no internet required
- ✅ **Multiple models** - Llama 2, Mistral, Phi, CodeLlama, and more

## Setup (5 minutes)

### 1. Install Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [ollama.com](https://ollama.com)

### 2. Pull a Model

Choose one based on your hardware:

**Recommended for most users (7B parameters, ~4GB RAM):**
```bash
ollama pull llama2
```

**For better quality (13B parameters, ~8GB RAM):**
```bash
ollama pull llama2:13b
```

**For fastest/lightest (3B parameters, ~2GB RAM):**
```bash
ollama pull phi
```

**Other options:**
```bash
ollama pull mistral      # Great balance of speed and quality
ollama pull codellama    # Optimized for code
ollama pull neural-chat  # Fine-tuned for chat
```

See all models at [ollama.com/library](https://ollama.com/library)

### 3. Start Ollama Server

```bash
ollama serve
```

This starts the server on `http://localhost:11434`

### 4. Configure Carrots Backend

Edit `backend/.env`:
```env
LLM_PROVIDER="ollama"
LLM_MODEL="llama2"
OLLAMA_BASE_URL="http://localhost:11434"
```

### 5. Start the Backend

```bash
cd backend
npm run dev
```

That's it! The commitment parser now uses your local LLM.

## Testing It Out

1. Open the frontend (http://localhost:3000)
2. Create or join a group
3. Click "Create Commitment"
4. Try the "Parse with AI" feature with:
   ```
   If Alice does 5 hours of coding, I will do 3 hours of coding
   ```

The parsing happens entirely on your machine!

## Switching Models

To try a different model:

1. Pull the new model:
   ```bash
   ollama pull mistral
   ```

2. Update `.env`:
   ```env
   LLM_MODEL="mistral"
   ```

3. Restart the backend

## Performance Tips

- **First request is slow** - models are loaded into memory on first use
- **Subsequent requests are fast** - model stays in memory
- **GPU acceleration** - automatically used if available (NVIDIA/AMD/Apple Silicon)
- **Memory usage** - model stays loaded until system restarts

## Troubleshooting

### "Connection refused"
- Make sure Ollama server is running: `ollama serve`
- Check it's running on port 11434: `curl http://localhost:11434`

### "Model not found"
- Pull the model first: `ollama pull llama2`
- Check available models: `ollama list`

### "Out of memory"
- Try a smaller model (phi, llama2:7b)
- Close other applications
- Check system requirements for your chosen model

### Poor parsing quality
- Try a larger model (llama2:13b, mistral)
- Switch to a cloud provider (OpenAI/Anthropic) for best quality
- The structured form is always available as a fallback

## Comparing Providers

| Provider | Cost | Speed | Quality | Privacy | Offline |
|----------|------|-------|---------|---------|---------|
| **Ollama (local)** | Free | Fast | Good | Private | Yes |
| **OpenAI GPT-4** | $$ | Fast | Excellent | Cloud | No |
| **Anthropic Claude** | $$ | Fast | Excellent | Cloud | No |

Choose based on your priorities!

## Advanced: Running Ollama in Docker

```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
docker exec -it ollama ollama pull llama2
```

Then use `OLLAMA_BASE_URL="http://localhost:11434"` in your `.env`

## Learn More

- [Ollama documentation](https://github.com/ollama/ollama)
- [Available models](https://ollama.com/library)
- [LangChain Ollama integration](https://js.langchain.com/docs/integrations/chat/ollama)
- [Full LLM Integration guide](./LLM_INTEGRATION.md)
