import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SimpleLiabilityCalculator } from '../services/simpleLiabilityCalculator';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/authenticate';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();
const calculator = new SimpleLiabilityCalculator();

/**
 * GET /api/groups/:id/liabilities
 * Get liabilities for all users in a group
 */
router.get('/groups/:id/liabilities', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user!.userId;

    // Verify group exists and user is a member
    const groupMembership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      include: {
        group: true,
      },
    });

    if (!groupMembership) {
      res.status(404).json({
        error: 'Group not found or you are not a member',
      });
      return;
    }

    // Calculate liabilities
    const calculatedAt = new Date();
    const liabilities = await calculator.calculateGroupLiabilities(groupId);

    // Save liabilities to database
    // Delete existing liabilities for this group
    await prisma.liability.deleteMany({
      where: { groupId },
    });

    // Create new liability records
    if (liabilities.length > 0) {
      await prisma.liability.createMany({
        data: liabilities.map((l) => ({
          groupId,
          userId: l.userId,
          action: l.action,
          amount: l.amount,
          unit: l.unit,
          calculatedAt,
          effectiveCommitmentIds: l.effectiveCommitmentIds,
        })),
      });
    }

    logger.info('Group liabilities calculated', { groupId, count: liabilities.length });

    res.status(200).json({
      liabilities: liabilities.map((l) => ({
        userId: l.userId,
        username: l.username,
        action: l.action,
        amount: l.amount,
        unit: l.unit,
        effectiveCommitmentIds: l.effectiveCommitmentIds,
      })),
      calculatedAt,
    });
  } catch (error) {
    logger.error('Calculate group liabilities error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to calculate group liabilities',
    });
  }
});

/**
 * GET /api/users/:id/liabilities
 * Get liabilities for a specific user across groups
 */
router.get('/users/:id/liabilities', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: targetUserId } = req.params;
    const currentUserId = req.user!.userId;
    const { groupId } = req.query;

    // Users can only view their own liabilities or those of users in their groups
    if (targetUserId !== currentUserId) {
      // Check if they share any groups
      const sharedGroups = await prisma.groupMembership.findMany({
        where: {
          userId: targetUserId,
          group: {
            memberships: {
              some: {
                userId: currentUserId,
              },
            },
          },
        },
        select: {
          groupId: true,
        },
      });

      if (sharedGroups.length === 0) {
        res.status(403).json({
          error: 'You can only view liabilities of users in your groups',
        });
        return;
      }
    }

    // Build where clause
    const where: any = {
      userId: targetUserId,
    };

    if (groupId && typeof groupId === 'string') {
      // Verify the requesting user is a member of this group
      const groupMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: currentUserId,
          },
        },
      });

      if (!groupMembership) {
        res.status(403).json({
          error: 'You are not a member of this group',
        });
        return;
      }

      where.groupId = groupId;
    } else {
      // Get all groups the target user is in that the requesting user is also in
      const sharedGroups = await prisma.groupMembership.findMany({
        where: {
          userId: targetUserId,
          group: {
            memberships: {
              some: {
                userId: currentUserId,
              },
            },
          },
        },
        select: {
          groupId: true,
        },
      });

      where.groupId = {
        in: sharedGroups.map((g) => g.groupId),
      };
    }

    // Get liabilities from database
    const liabilities = await prisma.liability.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { groupId: 'asc' },
        { action: 'asc' },
      ],
    });

    logger.info('User liabilities retrieved', { userId: targetUserId, count: liabilities.length });

    res.status(200).json({
      liabilities: liabilities.map((l) => ({
        id: l.id,
        groupId: l.groupId,
        groupName: l.group.name,
        action: l.action,
        amount: l.amount,
        unit: l.unit,
        calculatedAt: l.calculatedAt,
        effectiveCommitmentIds: l.effectiveCommitmentIds,
      })),
    });
  } catch (error) {
    logger.error('Get user liabilities error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user liabilities',
    });
  }
});

export default router;
