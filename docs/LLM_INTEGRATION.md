# LLM Integration Guide

This document describes the natural language processing (NLP) feature for parsing commitments in the Carrots application.

## Overview

The LLM integration allows users to create commitments by describing them in plain English, rather than using the structured form. The system uses **LangChain** to support multiple LLM providers including:

- **OpenAI** (GPT-4, GPT-3.5-turbo, etc.) - Cloud-based
- **Anthropic** (Claude models) - Cloud-based  
- **Ollama** (Llama 2, Mistral, Phi, etc.) - Local, free, private

This flexible architecture allows you to choose the provider that best fits your needs based on cost, privacy requirements, or availability.

## Architecture

### Backend Components

#### 1. LLM Provider System (`backend/src/services/llm/`)

**LangChain Integration**
- Uses industry-standard LangChain library for unified LLM interface
- `LLMProviderFactory.ts` - Factory for creating provider-specific chat models
- Supports OpenAI, Anthropic, and Ollama (local models) out of the box
- Easy to extend with additional LangChain-supported providers

**Key Features:**
- Provider-agnostic API - swap providers without code changes
- Consistent interface across all providers
- Built-in error handling and retry logic
- Support for both cloud and local models

#### 2. LLM Service (`backend/src/services/llmService.ts`)
- Manages LLM provider initialization via LangChain
- Handles natural language parsing requests
- Validates and transforms LLM outputs
- Maps usernames to user IDs for group context
- Implements error handling and rate limiting

#### 3. Parse Endpoint (`POST /api/commitments/parse`)
- Route: `POST /api/commitments/parse`
- Input: `{ naturalLanguageText: string, groupId: string }`
- Output: `{ success: boolean, parsed?: ParsedCommitment, clarificationNeeded?: string }`
- Requires authentication
- Validates user is a group member

### Frontend Components

#### 1. API Client (`frontend/src/api/commitments.ts`)
- `commitmentsApi.parse()` method for calling the parse endpoint

#### 2. UI Components (`frontend/src/components/CreateCommitmentDialog.tsx`)
- Prominent "Try Natural Language (Beta)" section
- Text input for natural language commitments
- "Parse with AI" button with loading state
- Success/error/clarification message display
- Auto-population of structured form with parsed results
- Ability to review and edit before submission

## Setup

### Prerequisites

- Node.js 18+ and npm
- For **OpenAI**: API key with GPT-4 access
- For **Anthropic**: API key for Claude models
- For **Ollama**: Ollama installed locally (free, no API key needed)

### Configuration

#### Option 1: OpenAI (Cloud)

Add configuration to `backend/.env`:
```env
LLM_PROVIDER="openai"
LLM_MODEL="gpt-4"
OPENAI_API_KEY="sk-your-actual-api-key-here"
```

#### Option 2: Anthropic Claude (Cloud)

Add configuration to `backend/.env`:
```env
LLM_PROVIDER="anthropic"
LLM_MODEL="claude-3-5-sonnet-20241022"
ANTHROPIC_API_KEY="sk-ant-your-actual-key-here"
```

#### Option 3: Ollama (Local - Free & Private!)

1. **Install Ollama** (if not already installed):
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Or download from https://ollama.com
   ```

2. **Pull a model** (one-time):
   ```bash
   ollama pull llama2  # or mistral, phi, codellama, etc.
   ```

3. **Start Ollama** (runs locally on port 11434):
   ```bash
   ollama serve
   ```

4. **Configure backend** in `backend/.env`:
   ```env
   LLM_PROVIDER="ollama"
   LLM_MODEL="llama2"
   OLLAMA_BASE_URL="http://localhost:11434"
   ```

**Benefits of Ollama:**
- ✅ **Completely free** - no API costs
- ✅ **Private** - data never leaves your machine
- ✅ **Fast** - no network latency
- ✅ **Available offline** - works without internet
- ✅ **Many models** - Llama 2, Mistral, Phi, CodeLlama, etc.

### Switching Providers

Simply change the `LLM_PROVIDER` environment variable and restart the backend:
```bash
# Switch to Ollama
LLM_PROVIDER="ollama"

# Switch to Anthropic
LLM_PROVIDER="anthropic"

# Switch to OpenAI
LLM_PROVIDER="openai"
```

No code changes required!

### Verify Installation

Run backend tests:
```bash
cd backend
npm test
```

## Usage

### For Users

1. Open the "Create Commitment" dialog in a group
2. Find the "Try Natural Language (Beta)" section at the top
3. Describe your commitment in plain English, for example:
   - "If Alice completes at least 5 hours of coding, I will do 3 hours of coding"
   - "If Bob does at least 3 hours of testing, I will do 2 hours plus 50% of any excess he does, up to 8 hours total"
   - "If others collectively do at least 10 hours of work, I will do at least 5 hours of work"
4. Click "Parse with AI"
5. Review the parsed conditions and promises in the structured form
6. Make any adjustments if needed
7. Click "Create" to submit the commitment

### For Developers

#### Parse API Example

```typescript
import { commitmentsApi } from './api/commitments';

const result = await commitmentsApi.parse({
  naturalLanguageText: "If Alice does 5 hours, I will do 3 hours",
  groupId: "group-uuid",
});

if (result.success && result.parsed) {
  console.log("Conditions:", result.parsed.conditions);
  console.log("Promises:", result.parsed.promises);
} else {
  console.log("Clarification needed:", result.clarificationNeeded);
}
```

#### LLM Service Example

```typescript
import { llmService } from './services/llmService';

// Check if enabled
if (llmService.isLLMEnabled()) {
  const result = await llmService.parseCommitment(
    "If Bob does 3 hours of work, I will do 2 hours",
    "group-id",
    "user-id"
  );
}
```

## Prompt Engineering

The LLM service uses a carefully crafted prompt that includes:

1. **Context**: List of group members and current user
2. **Format specification**: Detailed structure of conditions and promises
3. **Examples**: Multiple examples showing different commitment types
4. **Instructions**: Clear guidelines for handling ambiguity

### Prompt Features

- Instructs the model to verify usernames against group members
- Requests clarification for ambiguous statements
- Ensures consistent units within commitments
- Handles both simple and complex (proportional) commitments
- Validates that outputs are properly formatted JSON

## Error Handling

### Backend

1. **Missing API Key**: Service reports as disabled, returns clarification message
2. **Rate Limiting**: Detects 429 errors, returns user-friendly message
3. **Invalid JSON**: Catches parse errors, requests user to rephrase
4. **Unknown Users**: Validates usernames, provides list of valid members
5. **Validation Errors**: Checks parsed structure, returns specific error messages

### Frontend

1. **Service Unavailable (503)**: Shows message to use structured form
2. **Parse Errors**: Displays error message with retry option
3. **Clarifications**: Shows LLM's clarification question
4. **Success**: Shows success message and populates form
5. **Loading States**: Disables button and shows spinner during parsing

## Testing

### Unit Tests

The LLM service includes 10 unit tests covering:
- Service initialization with/without API key
- Disabled state handling
- Non-member rejection
- Basic validation logic

Run tests:
```bash
cd backend
npm test -- llmService.test.ts
```

### Manual Testing

1. **Without API Key**:
   - Set `OPENAI_API_KEY` to placeholder value
   - Verify "not configured" message appears
   
2. **With Valid API Key**:
   - Set real OpenAI API key
   - Test various commitment phrasings
   - Verify parsed results are correct

3. **Edge Cases**:
   - Test with non-member usernames
   - Test with ambiguous statements
   - Test with very short/long input

## Cost Considerations

### OpenAI API Costs

- Model: GPT-4
- Temperature: 0.3 (for consistency)
- Max Tokens: 1000
- Typical request: ~500-800 tokens total (prompt + completion)

Estimated cost per parse: ~$0.01-0.03 depending on input length

### Optimization Strategies

1. **Rate Limiting**: Already implemented via `apiRateLimiter` middleware
2. **Caching**: Could cache parsed results for identical inputs (future)
3. **Fallback**: Always provide structured form as alternative
4. **User Guidance**: Provide examples to improve first-attempt success rate

## Future Enhancements

### Planned Features

1. **Conversation Mode**: Multi-turn clarification dialogue
2. **Commitment Templates**: Suggest common patterns
3. **Result Confidence**: Show parsing confidence score
4. **History**: Remember user's previous commitment styles
5. **Alternative Models**: Support for other LLM providers
6. **Batch Parsing**: Parse multiple commitments at once

### Potential Improvements

1. **Caching Layer**: Redis cache for identical inputs
2. **Fine-tuning**: Train on commitment-specific dataset
3. **Validation Rules**: More sophisticated structural validation
4. **Error Recovery**: Better handling of partial parses
5. **Multi-language**: Support for non-English commitments

## Security Considerations

### Implemented Protections

1. **Authentication Required**: Parse endpoint requires valid JWT token
2. **Group Membership Check**: Verifies user is member of specified group
3. **Input Validation**: Length limits (10-1000 characters)
4. **Output Validation**: Validates LLM response before using
5. **No Code Execution**: Only structured data parsing
6. **Error Sanitization**: Prevents exposure of internal errors

### Security Audit Results

- **CodeQL**: No vulnerabilities found
- **Dependency Check**: OpenAI package v4.20.1 has no known vulnerabilities
- **API Key Protection**: Never exposed to frontend, stored in server env only

## Troubleshooting

### Common Issues

1. **"LLM service not configured"**
   - Check `OPENAI_API_KEY` in backend/.env
   - Verify it's not set to the placeholder value
   - Restart backend server after changing

2. **"API rate limit exceeded"**
   - Wait a moment and try again
   - Consider using structured form for bulk operations
   - Check OpenAI account quota

3. **Parse always fails**
   - Verify API key has GPT-4 access
   - Check backend logs for detailed error messages
   - Test with a simple commitment first

4. **Incorrect parsing**
   - Provide more detail in the description
   - Use group member usernames explicitly
   - Include specific numbers and units
   - Try structured form as alternative

### Debug Mode

Enable detailed logging:
```bash
# In backend/.env
LOG_LEVEL=debug
```

Check logs:
```bash
cd backend
npm run dev
# Watch for LLM service log messages
```

## References

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [GPT-4 Model Card](https://platform.openai.com/docs/models/gpt-4)
- [Carrots Implementation Strategy](../IMPLEMENTATION_STRATEGY.md)
- [Carrots API Documentation](./API.md)

## Support

For issues or questions:
1. Check this documentation first
2. Review backend logs for error details
3. Test with structured form to isolate LLM issues
4. Open a GitHub issue with reproduction steps
