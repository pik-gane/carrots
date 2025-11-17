import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/authenticate';
import { apiRateLimiter } from '../middleware/rateLimiter';
import { recalculateLiabilitiesAndNotify } from '../services/liabilityNotificationService';
import { emitNewMessage } from '../services/websocket';

const router = Router();
const prisma = new PrismaClient();

// Custom rate limiter for GET messages (used for polling)
// More lenient to support frequent polling without hitting limits
const messagesGetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Allow 200 requests per 15 minutes (supports 10-second polling)
  message: {
    error: 'Too many requests',
    message: 'Too many message fetch requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

// Validation schemas
const sendMessageSchema = z.object({
  groupId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  replyToMessageId: z.string().uuid().optional(),
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

    const { groupId, content, replyToMessageId } = validationResult.data;
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

    // Check if replying to a private clarification request
    let isPrivateReply = false;
    if (replyToMessageId) {
      const replyToMessage = await prisma.message.findUnique({
        where: { id: replyToMessageId },
      });

      // If replying to a clarification request that was sent to this user, make it private
      if (replyToMessage && 
          replyToMessage.type === 'clarification_request' && 
          replyToMessage.isPrivate && 
          replyToMessage.targetUserId === userId) {
        isPrivateReply = true;
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        groupId,
        userId,
        type: isPrivateReply ? 'clarification_response' : 'user_message',
        content,
        isPrivate: isPrivateReply,
        targetUserId: isPrivateReply ? null : undefined, // Private replies are to the system
        metadata: replyToMessageId ? { replyToMessageId } : undefined,
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
    
    // Emit message to all clients in the group via WebSocket
    emitNewMessage(groupId, message);
    
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
router.get('/', messagesGetRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
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

    // Check if there's a pending clarification for this user
    // Look for recent clarification requests (within last 10 minutes) that haven't been responded to
    const recentClarification = await prisma.message.findFirst({
      where: {
        groupId,
        type: 'clarification_request',
        targetUserId: userId,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // If there's a pending clarification, treat this message as a clarification response
    if (recentClarification) {
      // Check if user has already responded to this clarification
      const existingResponse = await prisma.message.findFirst({
        where: {
          groupId,
          userId,
          type: 'clarification_response',
          metadata: {
            path: ['replyToMessageId'],
            equals: recentClarification.id,
          },
        },
      });

      if (!existingResponse) {
        // This message is likely a response to the clarification
        // Update the message to make it private
        await prisma.message.update({
          where: { id: messageId },
          data: {
            type: 'clarification_response',
            isPrivate: true,
            targetUserId: null, // Private to system only
            metadata: {
              replyToMessageId: recentClarification.id,
            },
          },
        });
        
        // Get the original message that triggered the clarification
        const metadata = recentClarification.metadata as { originalMessageId?: string } | null;
        const originalMessageId = metadata?.originalMessageId;
        if (originalMessageId) {
          const originalMessage = await prisma.message.findUnique({
            where: { id: originalMessageId },
          });

          if (originalMessage) {
            // Combine original message with clarification response
            const combinedContext = `${originalMessage.content}\n\nClarification: ${content}`;
            
            // Try to detect commitment with the combined context
            const detectionResult = await llmService.detectCommitmentInMessage(
              combinedContext,
              groupId,
              userId
            );

            if (detectionResult.hasCommitment && detectionResult.commitment) {
              // Commitment detected after clarification
              const commitment = await prisma.commitment.create({
                data: {
                  groupId,
                  creatorId: userId,
                  status: 'active',
                  conditionType: detectionResult.commitment.conditions.some((c: any) => !c.targetUserId)
                    ? 'aggregate'
                    : 'single_user',
                  naturalLanguageText: originalMessage.content,
                  parsedCommitment: detectionResult.commitment as any,
                },
              });

              // Post system message with the rephrased commitment
              const rephrasedText = detectionResult.rephrased || 'Commitment created';
              const commitmentLink = `/groups/${groupId}?tab=commitments`;

              const commitmentMessage = await prisma.message.create({
                data: {
                  groupId,
                  userId: null, // System message
                  type: 'system_commitment',
                  content: `📝 New commitment detected: ${rephrasedText}`,
                  isPrivate: false,
                  metadata: {
                    commitmentId: commitment.id,
                    originalMessageId,
                    clarificationMessageId: recentClarification.id,
                    link: commitmentLink,
                    debug: detectionResult.debug,
                  },
                },
              });
              
              // Emit commitment message to all group members
              emitNewMessage(groupId, commitmentMessage);

              logger.info('Commitment created from clarification', { 
                commitmentId: commitment.id, 
                originalMessageId, 
                clarificationId: recentClarification.id 
              });

              // Recalculate liabilities
              await recalculateLiabilitiesAndNotify(groupId);
              return; // Done processing
            }
          }
        }
      }
    }

    // No pending clarification or not a response - process as normal message
    // Detect if the message contains a commitment
    const detectionResult = await llmService.detectCommitmentInMessage(content, groupId, userId);

    if (!detectionResult.hasCommitment) {
      // No commitment detected, nothing to do
      return;
    }

    if (detectionResult.needsClarification) {
      // LLM is unsure, ask for clarification
      const clarificationMessage = await prisma.message.create({
        data: {
          groupId,
          userId: null, // System message
          type: 'clarification_request',
          content: detectionResult.clarificationQuestion || 'Could you clarify what you meant?',
          isPrivate: true,
          targetUserId: userId,
          metadata: {
            originalMessageId: messageId,
            debug: detectionResult.debug,
          },
        },
      });
      logger.info('Clarification request sent', { messageId, userId });
      
      // Emit private clarification to specific user
      emitNewMessage(groupId, clarificationMessage);
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

      const commitmentMessage = await prisma.message.create({
        data: {
          groupId,
          userId: null, // System message
          type: 'system_commitment',
          content: `📝 New commitment detected: ${rephrasedText}`,
          isPrivate: false,
          metadata: {
            commitmentId: commitment.id,
            originalMessageId: messageId,
            link: commitmentLink, // Store link in metadata for frontend to render
            debug: detectionResult.debug,
          },
        },
      });
      
      // Emit commitment message to all group members
      emitNewMessage(groupId, commitmentMessage);

      logger.info('Commitment created from message', { commitmentId: commitment.id, messageId });

      // Recalculate liabilities
      await recalculateLiabilitiesAndNotify(groupId);
    }
  } catch (error) {
    logger.error('Error in processMessageForCommitment', { messageId, error });
    throw error;
  }
}

export default router;
