import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/authenticate';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const sendMessageSchema = z.object({
  groupId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const listMessagesSchema = z.object({
  groupId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  before: z.string().optional(), // ISO timestamp for pagination
});

/**
 * POST /api/messages
 * Send a message in a group chat
 */
router.post('/', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = sendMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const { groupId, content } = validationResult.data;
    const userId = req.user!.userId;

    // Check if user is a member of the group
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
      return;
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        groupId,
        userId,
        type: 'user_message',
        content,
        isPrivate: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    logger.info('Message sent', { messageId: message.id, groupId, userId });
    res.status(201).json({ message });

    // Asynchronously check for commitment in the message
    // This happens in the background and doesn't block the response
    processMessageForCommitment(message.id, groupId, userId, content).catch((error) => {
      logger.error('Error processing message for commitment', { messageId: message.id, error });
    });
  } catch (error) {
    logger.error('Send message error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send message',
    });
  }
});

/**
 * GET /api/messages
 * Get messages for a group
 */
router.get('/', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const validationResult = listMessagesSchema.safeParse({
      groupId: req.query.groupId,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      before: req.query.before,
    });

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const { groupId, limit, before } = validationResult.data;
    const userId = req.user!.userId;

    // Check if user is a member of the group
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
      return;
    }

    // Build query filter
    const whereClause: any = {
      groupId,
      OR: [
        { isPrivate: false }, // Public messages
        { isPrivate: true, targetUserId: userId }, // Private messages for this user
        { isPrivate: true, userId: userId }, // Private messages from this user
      ],
    };

    if (before) {
      whereClause.createdAt = {
        lt: new Date(before),
      };
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Reverse to get chronological order
    messages.reverse();

    res.json({ messages });
  } catch (error) {
    logger.error('List messages error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to list messages',
    });
  }
});

/**
 * Process a message to detect commitments
 * This runs asynchronously after a message is sent
 */
async function processMessageForCommitment(
  messageId: string,
  groupId: string,
  userId: string,
  content: string
): Promise<void> {
  try {
    // Import LLM service dynamically to avoid circular dependencies
    const { LLMService } = await import('../services/llmService');
    const llmService = new LLMService();

    if (!llmService.isLLMEnabled()) {
      // LLM is not configured, skip processing
      return;
    }

    // Detect if the message contains a commitment
    const detectionResult = await llmService.detectCommitmentInMessage(content, groupId, userId);

    if (!detectionResult.hasCommitment) {
      // No commitment detected, nothing to do
      return;
    }

    if (detectionResult.needsClarification) {
      // LLM is unsure, ask for clarification
      await prisma.message.create({
        data: {
          groupId,
          userId: null, // System message
          type: 'clarification_request',
          content: detectionResult.clarificationQuestion || 'Could you clarify what you meant?',
          isPrivate: true,
          targetUserId: userId,
          metadata: {
            originalMessageId: messageId,
          },
        },
      });
      logger.info('Clarification request sent', { messageId, userId });
      return;
    }

    if (detectionResult.commitment) {
      // Commitment detected, create it
      const commitment = await prisma.commitment.create({
        data: {
          groupId,
          creatorId: userId,
          status: 'active',
          conditionType: detectionResult.commitment.conditions.some((c: any) => !c.targetUserId)
            ? 'aggregate'
            : 'single_user',
          naturalLanguageText: content,
          parsedCommitment: detectionResult.commitment as any,
        },
      });

      // Post system message with the rephrased commitment
      const rephrasedText = detectionResult.rephrased || 'Commitment created';
      const commitmentLink = `/groups/${groupId}?tab=commitments`;

      await prisma.message.create({
        data: {
          groupId,
          userId: null, // System message
          type: 'system_commitment',
          content: `📝 New commitment detected: ${rephrasedText}\n\n[View in Commitment Panel](${commitmentLink})`,
          isPrivate: false,
          metadata: {
            commitmentId: commitment.id,
            originalMessageId: messageId,
          },
        },
      });

      logger.info('Commitment created from message', { commitmentId: commitment.id, messageId });

      // Recalculate liabilities
      await recalculateLiabilitiesAndNotify(groupId);
    }
  } catch (error) {
    logger.error('Error in processMessageForCommitment', { messageId, error });
    throw error;
  }
}

/**
 * Recalculate liabilities for a group and notify about changes
 */
async function recalculateLiabilitiesAndNotify(groupId: string): Promise<void> {
  try {
    // Get old liabilities
    const oldLiabilities = await prisma.liability.findMany({
      where: { groupId },
    });

    // Import liability calculator
    const { LiabilityCalculator } = await import('../services/liabilityCalculator');
    const calculator = new LiabilityCalculator();

    // Calculate new liabilities
    const calculatedLiabilities = await calculator.calculateGroupLiabilities(groupId);

    // Update liabilities in database
    const newLiabilities = [];
    for (const liability of calculatedLiabilities) {
      await prisma.liability.upsert({
        where: {
          groupId_userId_action: {
            groupId,
            userId: liability.userId,
            action: liability.action,
          },
        },
        update: {
          amount: liability.amount,
          unit: liability.unit,
          effectiveCommitmentIds: liability.effectiveCommitmentIds as any,
          calculatedAt: new Date(),
        },
        create: {
          groupId,
          userId: liability.userId,
          action: liability.action,
          amount: liability.amount,
          unit: liability.unit,
          effectiveCommitmentIds: liability.effectiveCommitmentIds as any,
        },
      });

      newLiabilities.push({
        userId: liability.userId,
        action: liability.action,
        amount: liability.amount,
        unit: liability.unit,
      });
    }

    // Detect changes and create notification
    const changes = detectLiabilityChanges(oldLiabilities, newLiabilities);

    if (changes.length > 0) {
      const changeText = formatLiabilityChanges(changes);
      await prisma.message.create({
        data: {
          groupId,
          userId: null, // System message
          type: 'system_liability',
          content: `⚖️ Liability Update:\n\n${changeText}`,
          isPrivate: false,
          metadata: {
            changes,
          },
        },
      });

      logger.info('Liability changes notified', { groupId, changeCount: changes.length });
    }
  } catch (error) {
    logger.error('Error recalculating liabilities', { groupId, error });
    throw error;
  }
}

/**
 * Detect changes between old and new liabilities
 */
function detectLiabilityChanges(
  oldLiabilities: any[],
  newLiabilities: any[]
): Array<{ userId: string; action: string; oldAmount: number; newAmount: number; unit: string }> {
  const changes: Array<{ userId: string; action: string; oldAmount: number; newAmount: number; unit: string }> = [];

  const oldMap = new Map<string, { amount: number; unit: string }>();
  for (const liability of oldLiabilities) {
    oldMap.set(`${liability.userId}:${liability.action}`, {
      amount: liability.amount,
      unit: liability.unit,
    });
  }

  for (const newLiability of newLiabilities) {
    const key = `${newLiability.userId}:${newLiability.action}`;
    const old = oldMap.get(key);

    if (!old) {
      // New liability
      changes.push({
        userId: newLiability.userId,
        action: newLiability.action,
        oldAmount: 0,
        newAmount: newLiability.amount,
        unit: newLiability.unit,
      });
    } else if (old.amount !== newLiability.amount) {
      // Changed liability
      changes.push({
        userId: newLiability.userId,
        action: newLiability.action,
        oldAmount: old.amount,
        newAmount: newLiability.amount,
        unit: newLiability.unit,
      });
    }
  }

  return changes;
}

/**
 * Format liability changes as natural language
 */
function formatLiabilityChanges(
  changes: Array<{ userId: string; action: string; oldAmount: number; newAmount: number; unit: string }>
): string {
  return changes
    .map((change) => {
      if (change.oldAmount === 0) {
        return `• New: ${change.action} - ${change.newAmount} ${change.unit}`;
      } else if (change.newAmount > change.oldAmount) {
        return `• ${change.action} increased from ${change.oldAmount} to ${change.newAmount} ${change.unit}`;
      } else {
        return `• ${change.action} decreased from ${change.oldAmount} to ${change.newAmount} ${change.unit}`;
      }
    })
    .join('\n');
}

export default router;
