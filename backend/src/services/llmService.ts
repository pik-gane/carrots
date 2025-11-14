import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { ParsedCommitment, NLPParseResponse } from '../types';
import { LLMProviderFactory, LLMProviderType } from './llm';

// Use require for LangChain imports to avoid TypeScript module resolution issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BaseChatModel } = require('@langchain/core/language_models/chat_models');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

const prisma = new PrismaClient();

/**
 * LLMService - Natural language processing for commitment parsing
 * 
 * Uses LangChain to support multiple LLM providers (OpenAI, Anthropic, Ollama/local models)
 * through a unified interface. This allows flexibility in choosing different providers
 * based on requirements, cost, privacy, or availability.
 */
export class LLMService {
  private chatModel: typeof BaseChatModel | null = null;
  private providerType: LLMProviderType;

  constructor() {
    // Create chat model using LangChain
    this.providerType = LLMProviderFactory.getConfiguredProvider();
    this.chatModel = LLMProviderFactory.createChatModel();
    
    if (!this.chatModel) {
      logger.warn('No LLM provider configured. NLP features will be disabled.');
    } else {
      logger.info(`LLM Service initialized with ${this.providerType} provider`);
    }
  }

  /**
   * Check if LLM service is enabled
   */
  public isLLMEnabled(): boolean {
    return this.chatModel !== null;
  }

  /**
   * Get the name of the active provider
   */
  public getProviderName(): string {
    return this.providerType || 'none';
  }

  /**
   * Get list of available providers
   */
  public static getAvailableProviders(): LLMProviderType[] {
    return LLMProviderFactory.getAvailableProviders();
  }

  /**
   * Parse natural language commitment into structured format
   */
  async parseCommitment(
    naturalLanguageText: string,
    groupId: string,
    userId: string,
    includeDebug: boolean = false
  ): Promise<NLPParseResponse> {
    if (!this.chatModel) {
      return {
        success: false,
        clarificationNeeded: 'LLM service is not configured. Please use structured commitment input.',
      };
    }

    try {
      // Get group members for context
      const members = await this.getGroupMembers(groupId);
      const memberNames = members.map((m) => m.user.username).join(', ');
      const currentUser = members.find((m) => m.userId === userId);

      if (!currentUser) {
        return {
          success: false,
          clarificationNeeded: 'You are not a member of this group.',
        };
      }

      // Build the prompt
      const prompt = this.buildPrompt(naturalLanguageText, memberNames, currentUser.user.username);

      logger.info(`Sending commitment to ${this.providerType} for parsing`, {
        groupId,
        userId,
        textLength: naturalLanguageText.length,
        provider: this.providerType,
        debug: includeDebug,
      });

      // Call LLM using LangChain
      const systemMessage = 'You are a commitment parser for the Carrots app. Parse natural language commitments into structured JSON format. Always respond with valid JSON.';
      const messages = [
        new SystemMessage(systemMessage),
        new HumanMessage(prompt),
      ];

      const response = await this.chatModel.invoke(messages);
      const responseText = response.content.toString();

      if (!responseText) {
        logger.error(`Empty response from ${this.providerType}`);
        return {
          success: false,
          clarificationNeeded: 'Failed to parse commitment. Please try rephrasing or use structured input.',
        };
      }

      // Parse the JSON response
      let parsedResponse;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        parsedResponse = JSON.parse(jsonText.trim());
      } catch (parseError) {
        logger.error(`Failed to parse ${this.providerType} response as JSON`, { responseText, parseError });
        return {
          success: false,
          clarificationNeeded: 'Failed to parse commitment. Please try rephrasing or use structured input.',
        };
      }

      // Validate the response
      if (parsedResponse.clarificationNeeded) {
        return {
          success: false,
          clarificationNeeded: parsedResponse.clarificationNeeded,
        };
      }

      if (!parsedResponse.parsed) {
        return {
          success: false,
          clarificationNeeded: 'Could not understand the commitment. Please provide more details or use structured input.',
        };
      }

      // Validate and transform the parsed commitment
      const validatedCommitment = await this.validateAndTransformParsedCommitment(
        parsedResponse.parsed,
        groupId,
        members
      );

      if (!validatedCommitment.success) {
        const result: NLPParseResponse = {
          success: false,
          clarificationNeeded: validatedCommitment.error || 'Invalid commitment format.',
        };
        
        // Include debug information even for failures if requested
        if (includeDebug) {
          result.debug = {
            prompt,
            response: responseText,
            provider: this.providerType,
          };
        }
        
        return result;
      }

      logger.info('Successfully parsed commitment', { 
        groupId, 
        userId,
        provider: this.providerType,
      });

      const result: NLPParseResponse = {
        success: true,
        parsed: validatedCommitment.commitment,
      };

      // Include debug information if requested
      if (includeDebug) {
        result.debug = {
          prompt,
          response: responseText,
          provider: this.providerType,
        };
      }

      return result;
    } catch (error: any) {
      logger.error('LLM parsing error', { 
        error: error.message, 
        stack: error.stack,
        provider: this.providerType,
      });
      
      // Handle rate limiting errors
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        return {
          success: false,
          clarificationNeeded: 'API rate limit exceeded. Please try again in a moment or use structured input.',
        };
      }

      // Handle other API errors
      if (error.message) {
        return {
          success: false,
          clarificationNeeded: `API error: ${error.message}. Please try again or use structured input.`,
        };
      }

      return {
        success: false,
        clarificationNeeded: 'An error occurred while parsing. Please try again or use structured input.',
      };
    }
  }

  /**
   * Build the prompt for the LLM
   */
  private buildPrompt(naturalLanguageText: string, memberNames: string, currentUsername: string): string {
    return `You are parsing a conditional commitment for the Carrots app.

Group members: ${memberNames}
Current user making the commitment: ${currentUsername}

User's commitment statement: "${naturalLanguageText}"

Parse this into a structured commitment with the following format:

A commitment consists of:
1. **Conditions** (array): Each condition specifies what must happen for the commitment to activate
   - targetUserId: username of the specific person (or null for aggregate/combined conditions about "others")
   - action: the task/action name (string)
   - minAmount: minimum quantity (number)
   - unit: unit of measurement (string like "hours", "tasks", "dollars")

2. **Promises** (array): What the user commits to do if conditions are met
   - action: the task/action the user will perform (string)
   - baseAmount: fixed base amount (number, use 0 if none)
   - proportionalAmount: amount per unit of excess (number, use 0 if none)
   - referenceUserId: username whose excess to track (optional, for proportional promises)
   - referenceAction: the action to monitor (optional, for proportional promises)
   - thresholdAmount: threshold for calculating excess (optional, for proportional promises)
   - maxAmount: maximum cap for this promise (optional, but recommended to keep liabilities finite)
   - unit: unit of measurement (string)

Examples:
- "If Alice does at least 5 hours of coding, I will do at least 3 hours of coding"
  → conditions: [{targetUserId: "alice", action: "coding", minAmount: 5, unit: "hours"}]
  → promises: [{action: "coding", baseAmount: 3, proportionalAmount: 0, unit: "hours"}]

- "If others collectively do at least 10 hours of work, I will do at least 5 hours of work"
  → conditions: [{targetUserId: null, action: "work", minAmount: 10, unit: "hours"}]
  → promises: [{action: "work", baseAmount: 5, proportionalAmount: 0, unit: "hours"}]

- "If Bob does at least 3 hours of testing, I will do 2 hours plus 50% of any excess he does, up to 8 hours total"
  → conditions: [{targetUserId: "bob", action: "testing", minAmount: 3, unit: "hours"}]
  → promises: [{action: "testing", baseAmount: 2, proportionalAmount: 0.5, referenceUserId: "bob", referenceAction: "testing", thresholdAmount: 3, maxAmount: 8, unit: "hours"}]

Response format (JSON only, no markdown):
If successful:
{
  "success": true,
  "parsed": {
    "conditions": [{ ... }],
    "promises": [{ ... }]
  }
}

If you need clarification:
{
  "success": false,
  "clarificationNeeded": "What specific question to ask the user"
}

Important:
- Only include usernames that exist in the group members list
- If a username is mentioned but not in the list, ask for clarification
- If the statement is ambiguous, ask for clarification
- Always use consistent units within the commitment
- For proportional promises, include thresholdAmount and maxAmount
- Respond with ONLY valid JSON, no additional text`;
  }

  /**
   * Get group members for context
   */
  private async getGroupMembers(groupId: string) {
    return await prisma.groupMembership.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Validate and transform the parsed commitment from LLM
   */
  private async validateAndTransformParsedCommitment(
    parsed: any,
    _groupId: string,
    members: any[]
  ): Promise<{ success: boolean; commitment?: ParsedCommitment; error?: string }> {
    try {
      // Validate structure
      if (!parsed.conditions || !Array.isArray(parsed.conditions)) {
        return { success: false, error: 'Invalid conditions format' };
      }

      if (!parsed.promises || !Array.isArray(parsed.promises)) {
        return { success: false, error: 'Invalid promises format' };
      }

      if (parsed.conditions.length === 0) {
        return { success: false, error: 'At least one condition is required' };
      }

      if (parsed.promises.length === 0) {
        return { success: false, error: 'At least one promise is required' };
      }

      // Create username to userId mapping
      const usernameToId = new Map<string, string>();
      members.forEach((m) => {
        usernameToId.set(m.user.username.toLowerCase(), m.userId);
      });

      // Transform and validate conditions
      const conditions = [];
      for (const cond of parsed.conditions) {
        if (!cond.action || typeof cond.action !== 'string') {
          return { success: false, error: 'Condition must have an action' };
        }

        if (typeof cond.minAmount !== 'number' || cond.minAmount <= 0) {
          return { success: false, error: 'Condition minAmount must be a positive number' };
        }

        if (!cond.unit || typeof cond.unit !== 'string') {
          return { success: false, error: 'Condition must have a unit' };
        }

        let targetUserId: string | undefined = undefined;
        if (cond.targetUserId) {
          const userId = usernameToId.get(cond.targetUserId.toLowerCase());
          if (!userId) {
            return {
              success: false,
              error: `User "${cond.targetUserId}" is not a member of this group. Available members: ${Array.from(usernameToId.keys()).join(', ')}`,
            };
          }
          targetUserId = userId;
        }

        conditions.push({
          targetUserId,
          action: cond.action,
          minAmount: cond.minAmount,
          unit: cond.unit,
        });
      }

      // Transform and validate promises
      const promises = [];
      for (const prom of parsed.promises) {
        if (!prom.action || typeof prom.action !== 'string') {
          return { success: false, error: 'Promise must have an action' };
        }

        if (!prom.unit || typeof prom.unit !== 'string') {
          return { success: false, error: 'Promise must have a unit' };
        }

        const baseAmount = typeof prom.baseAmount === 'number' ? prom.baseAmount : 0;
        const proportionalAmount = typeof prom.proportionalAmount === 'number' ? prom.proportionalAmount : 0;

        if (baseAmount < 0 || proportionalAmount < 0) {
          return { success: false, error: 'Promise amounts must be non-negative' };
        }

        if (baseAmount === 0 && proportionalAmount === 0) {
          return { success: false, error: 'Promise must have either baseAmount or proportionalAmount greater than 0' };
        }

        const promise: any = {
          action: prom.action,
          baseAmount,
          proportionalAmount,
          unit: prom.unit,
        };

        // Handle proportional promise fields
        if (proportionalAmount > 0) {
          if (prom.referenceUserId) {
            const userId = usernameToId.get(prom.referenceUserId.toLowerCase());
            if (!userId) {
              return {
                success: false,
                error: `Reference user "${prom.referenceUserId}" is not a member of this group`,
              };
            }
            promise.referenceUserId = userId;
          }

          if (prom.referenceAction) {
            promise.referenceAction = prom.referenceAction;
          }

          if (typeof prom.thresholdAmount === 'number') {
            promise.thresholdAmount = prom.thresholdAmount;
          }

          if (typeof prom.maxAmount === 'number' && prom.maxAmount > 0) {
            promise.maxAmount = prom.maxAmount;
          }
        }

        promises.push(promise);
      }

      const commitment: ParsedCommitment = {
        conditions,
        promises,
      };

      return { success: true, commitment };
    } catch (error: any) {
      logger.error('Validation error', { error: error.message });
      return { success: false, error: 'Failed to validate parsed commitment' };
    }
  }
}

// Singleton instance
export const llmService = new LLMService();
