/**
 * LLM Provider Module (LangChain-based)
 * 
 * Provides a generic abstraction layer using LangChain for working with different LLM providers.
 * Supports:
 * - OpenAI (GPT-4, GPT-3.5-turbo, etc.)
 * - Anthropic (Claude models)
 * - Ollama (Local models: Llama 2, Mistral, etc.)
 * - Easy to extend with any LangChain-supported provider
 */

export * from './LLMProviderFactory';
