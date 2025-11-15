import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOllama } from '@langchain/ollama';
import { logger } from '../../utils/logger';

/**
 * Supported LLM Provider Types
 * 
 * - openai: OpenAI's GPT models (GPT-4, GPT-3.5-turbo, etc.)
 * - anthropic: Anthropic's Claude models
 * - ollama: Local models via Ollama (Llama 2, Mistral, etc.)
 */
export type LLMProviderType = 'openai' | 'anthropic' | 'ollama';

export interface LLMProviderConfig {
  provider: LLMProviderType;
  model?: string;
  apiKey?: string;
  baseURL?: string; // For Ollama or custom endpoints
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM Provider Factory
 * 
 * Creates LangChain chat model instances based on configuration.
 * Supports multiple providers through LangChain's unified interface.
 * 
 * Key features:
 * - Uses industry-standard LangChain library
 * - Supports OpenAI, Anthropic, and local models (Ollama)
 * - Easy to extend with more providers
 * - Consistent interface across all providers
 */
export class LLMProviderFactory {
  /**
   * Create a chat model based on configuration
   * 
   * @param config - Provider configuration
   * @returns Configured LangChain chat model or null if not configured
   */
  static createChatModel(config?: Partial<LLMProviderConfig>): any | null {
    // Get provider type from config or environment
    const providerType = config?.provider || 
                        (process.env.LLM_PROVIDER as LLMProviderType) || 
                        'openai';

    try {
      switch (providerType) {
        case 'openai':
          return this.createOpenAI(config);
        
        case 'anthropic':
          return this.createAnthropic(config);
        
        case 'ollama':
          return this.createOllama(config);
        
        default:
          logger.error(`Unknown LLM provider type: ${providerType}`);
          return null;
      }
    } catch (error: any) {
      logger.error(`Failed to create ${providerType} provider`, { error: error.message });
      return null;
    }
  }

  /**
   * Create OpenAI chat model
   */
  private static createOpenAI(config?: Partial<LLMProviderConfig>): ChatOpenAI | null {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
      logger.warn('OpenAI API key not configured.');
      return null;
    }

    const model = config?.model || process.env.LLM_MODEL || 'gpt-4';
    
    logger.info('Creating OpenAI chat model', { model });
    
    return new ChatOpenAI({
      modelName: model,
      openAIApiKey: apiKey,
      temperature: config?.temperature ?? 0.3,
      maxTokens: config?.maxTokens ?? 1000,
    });
  }

  /**
   * Create Anthropic chat model
   */
  private static createAnthropic(config?: Partial<LLMProviderConfig>): ChatAnthropic | null {
    const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      logger.warn('Anthropic API key not configured.');
      return null;
    }

    const model = config?.model || process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022';
    
    logger.info('Creating Anthropic chat model', { model });
    
    return new ChatAnthropic({
      modelName: model,
      anthropicApiKey: apiKey,
      temperature: config?.temperature ?? 0.3,
      maxTokens: config?.maxTokens ?? 1000,
    });
  }

  /**
   * Create Ollama chat model (local)
   */
  private static createOllama(config?: Partial<LLMProviderConfig>): ChatOllama | null {
    const baseUrl = config?.baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = config?.model || process.env.LLM_MODEL || 'llama2';
    
    logger.info('Creating Ollama chat model', { model, baseUrl });
    
    return new ChatOllama({
      model,
      baseUrl,
      temperature: config?.temperature ?? 0.3,
      // Ollama uses numPredict instead of maxTokens
      numPredict: config?.maxTokens ?? 1000,
    });
  }

  /**
   * Get list of available providers based on configuration
   */
  static getAvailableProviders(): LLMProviderType[] {
    const available: LLMProviderType[] = [];
    
    // Check OpenAI
    if (process.env.OPENAI_API_KEY && 
        process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key-here') {
      available.push('openai');
    }
    
    // Check Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      available.push('anthropic');
    }
    
    // Check Ollama (assume available if explicitly configured or if baseURL is set)
    if (process.env.LLM_PROVIDER === 'ollama' || process.env.OLLAMA_BASE_URL) {
      available.push('ollama');
    }
    
    return available;
  }

  /**
   * Get the configured provider name
   */
  static getConfiguredProvider(): LLMProviderType {
    return (process.env.LLM_PROVIDER as LLMProviderType) || 'openai';
  }
}
