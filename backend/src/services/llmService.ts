import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { ParsedCommitment, NLPParseResponse } from '../types';
import { LLMProviderFactory, LLMProviderType } from './llm';
import fs from 'fs';
import path from 'path';

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
   * Log debug information to file
   */
  private async logDebugToFile(prompt: string, response: string, userId: string, groupId: string): Promise<void> {
    try {
      const logsDir = path.join(__dirname, '../../logs/llm-debug');
      
      // Ensure logs directory exists
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `llm-debug-${timestamp}-${userId.substring(0, 8)}.log`;
      const filepath = path.join(logsDir, filename);

      const logContent = `
================================================================================
LLM DEBUG LOG
================================================================================
Timestamp: ${new Date().toISOString()}
User ID: ${userId}
Group ID: ${groupId}
Provider: ${this.providerType}

PROMPT:
--------------------------------------------------------------------------------
${prompt}

RESPONSE:
--------------------------------------------------------------------------------
${response}

================================================================================
`;

      fs.writeFileSync(filepath, logContent, 'utf8');
      logger.info('Debug information logged to file', { filepath, userId, groupId });
    } catch (error: any) {
      logger.error('Failed to write debug log file', { error: error.message });
    }
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

    let prompt: string | undefined;

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

      // Get existing commitments for context
      const existingCommitments = await this.getExistingCommitments(groupId);

      // Build the prompt
      prompt = this.buildPrompt(naturalLanguageText, memberNames, currentUser.user.username, existingCommitments, members);

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
        // Try multiple extraction strategies
        let jsonText = responseText;
        
        // 1. Extract from markdown code blocks
        const markdownMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                             responseText.match(/```\s*([\s\S]*?)\s*```/);
        if (markdownMatch) {
          jsonText = markdownMatch[1];
        } else {
          // 2. Extract JSON object from text (find first { to last })
          const firstBrace = responseText.indexOf('{');
          const lastBrace = responseText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonText = responseText.substring(firstBrace, lastBrace + 1);
          }
        }
        
        parsedResponse = JSON.parse(jsonText.trim());
      } catch (parseError) {
        logger.error(`Failed to parse ${this.providerType} response as JSON`, { responseText, parseError });
        
        const result: NLPParseResponse = {
          success: false,
          clarificationNeeded: 'Failed to parse commitment. Please try rephrasing or use structured input.',
        };
        
        // Include debug information if requested (even for parsing failures)
        if (includeDebug) {
          result.debug = {
            prompt,
            response: responseText,
            provider: this.providerType,
          };
          
          // Log debug information to file
          await this.logDebugToFile(prompt, responseText, userId, groupId);
        }
        
        return result;
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

      // Log debug information to file if requested
      if (includeDebug && prompt) {
        await this.logDebugToFile(prompt, responseText, userId, groupId);
      }

      const result: NLPParseResponse = {
        success: true,
        parsed: validatedCommitment.commitment,
      };

      // Include explanation if provided by LLM
      if (parsedResponse.explanation) {
        result.explanation = parsedResponse.explanation;
      }

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
      
      const result: NLPParseResponse = {
        success: false,
        clarificationNeeded: 'An error occurred while parsing. Please try again or use structured input.',
      };
      
      // Handle rate limiting errors
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        result.clarificationNeeded = 'API rate limit exceeded. Please try again in a moment or use structured input.';
      } else if (error.message) {
        // Handle other API errors
        result.clarificationNeeded = `API error: ${error.message}. Please try again or use structured input.`;
      }

      // Include debug information if requested (even for errors)
      if (includeDebug) {
        const errorPrompt = prompt || 'Error occurred before prompt was generated';
        const errorResponse = error.message || 'No response received';
        
        result.debug = {
          prompt: errorPrompt,
          response: errorResponse,
          provider: this.providerType,
        };
        
        // Log error debug information to file
        await this.logDebugToFile(errorPrompt, errorResponse, userId, groupId);
      }

      return result;
    }
  }

  /**
   * Build the prompt for the LLM
   */
  private buildPrompt(
    naturalLanguageText: string, 
    memberNames: string, 
    currentUsername: string,
    existingCommitments: any[],
    members: any[]
  ): string {
    // Create a user ID to username mapping
    const userIdToUsername = new Map<string, string>();
    members.forEach((m) => {
      userIdToUsername.set(m.userId, m.user.username);
    });

    // Format existing commitments for the prompt
    const formattedCommitments = existingCommitments.map((commitment) => {
      const parsed = commitment.parsedCommitment as any;
      
      // Convert user IDs to usernames for readability
      const conditionsWithUsernames = parsed.conditions.map((cond: any) => ({
        targetUser: cond.targetUserId ? userIdToUsername.get(cond.targetUserId) : null,
        action: cond.action,
        minAmount: cond.minAmount,
        unit: cond.unit,
      }));

      const promisesWithUsernames = parsed.promises.map((prom: any) => ({
        action: prom.action,
        baseAmount: prom.baseAmount,
        proportionalAmount: prom.proportionalAmount,
        referenceUser: prom.referenceUserId ? userIdToUsername.get(prom.referenceUserId) : null,
        referenceAction: prom.referenceAction,
        thresholdAmount: prom.thresholdAmount,
        maxAmount: prom.maxAmount,
        unit: prom.unit,
      }));

      return {
        creator: commitment.creator.username,
        conditions: conditionsWithUsernames,
        promises: promisesWithUsernames,
      };
    });

    const existingCommitmentsJson = JSON.stringify(formattedCommitments, null, 2);

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
   - NOTE: Conditions can be empty array for UNCONDITIONAL commitments (e.g., "I will do 5 hours of work")

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

- "I will do 10 hours of work" (unconditional commitment)
  → conditions: []
  → promises: [{action: "work", baseAmount: 10, proportionalAmount: 0, unit: "hours"}]

Response format (JSON only, no markdown):
If successful:
{
  "success": true,
  "parsed": {
    "conditions": [{ ... }],
    "promises": [{ ... }]
  },
  "explanation": "A brief explanation of how you interpreted the user's input, especially: (1) which actions you matched to existing actions in the group's commitments, (2) which units you converted or matched to existing units, and (3) any other notable interpretation decisions you made."
}

If you need clarification:
{
  "success": false,
  "clarificationNeeded": "What specific question to ask the user"
}

IMPORTANT INSTRUCTIONS:
- Commitments can be CONDITIONAL (with conditions) or UNCONDITIONAL (empty conditions array)
- Try to match the actions and units mentioned by the user to actions and units already present in the existing commitments below
- If an action name is similar to an existing one, use the existing action name for consistency
- If units don't match but the action does, convert the newly mentioned units to the existing units when possible
- In your "explanation" field, clearly state when you've matched actions or converted units
- Only include usernames that exist in the group members list
- If a username is mentioned but not in the list, ask for clarification
- If the statement is ambiguous, ask for clarification
- Always use consistent units within the commitment
- For proportional promises, include thresholdAmount and maxAmount
- Respond with ONLY valid JSON, no additional text

EXISTING COMMITMENTS IN THIS GROUP:
${existingCommitmentsJson}`;
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
   * Get existing active commitments for the group
   */
  private async getExistingCommitments(groupId: string) {
    return await prisma.commitment.findMany({
      where: {
        groupId,
        status: 'active',
      },
      include: {
        creator: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
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

      // Conditions can be empty for unconditional commitments
      // if (parsed.conditions.length === 0) {
      //   return { success: false, error: 'At least one condition is required' };
      // }

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
