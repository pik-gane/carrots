import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createCommitmentSchema,
  updateCommitmentSchema,
  commitmentQuerySchema,
  CreateCommitmentInput,
  UpdateCommitmentInput,
  CommitmentQueryInput,
} from '../utils/commitment/validation';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/authenticate';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/commitments
 * Create a new commitment
 */
router.post('/', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = createCommitmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const { groupId, parsedCommitment, naturalLanguageText } = validationResult.data as CreateCommitmentInput;
    const userId = req.user!.userId;

    // Verify the group exists and user is a member
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

    // If condition is single_user, verify the target user is a member
    if (parsedCommitment.condition.type === 'single_user' && parsedCommitment.condition.targetUserId) {
      const targetMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: parsedCommitment.condition.targetUserId,
          },
        },
      });

      if (!targetMembership) {
        res.status(400).json({
          error: 'Target user is not a member of this group',
        });
        return;
      }
    }

    // Check for existing commitments with the same action but different units
    const existingCommitments = await prisma.commitment.findMany({
      where: {
        groupId,
        status: 'active',
      },
    });

    const warnings: string[] = [];
    const actionsToCheck = [];
    
    // Only check condition if it's not unconditional
    if (parsedCommitment.condition.type !== 'unconditional' && parsedCommitment.condition.action) {
      actionsToCheck.push({ 
        action: parsedCommitment.condition.action, 
        unit: parsedCommitment.condition.unit!, 
        type: 'condition' 
      });
    }
    
    actionsToCheck.push({ 
      action: parsedCommitment.promise.action, 
      unit: parsedCommitment.promise.unit, 
      type: 'promise' 
    });

    for (const { action, unit, type } of actionsToCheck) {
      // Find existing units for this action
      const existingUnits = new Set<string>();
      for (const commitment of existingCommitments) {
        const parsed = commitment.parsedCommitment as any;
        if (parsed.condition?.action === action && parsed.condition?.unit !== unit) {
          existingUnits.add(parsed.condition.unit);
        }
        if (parsed.promise?.action === action && parsed.promise?.unit !== unit) {
          existingUnits.add(parsed.promise.unit);
        }
      }

      if (existingUnits.size > 0) {
        const unitsList = Array.from(existingUnits).join(', ');
        warnings.push(
          `Action "${action}" in your ${type} uses unit "${unit}", but other commitments in this group use: ${unitsList}. ` +
          `Using different units will result in these being treated as separate actions. ` +
          `Consider using the existing unit(s) for consistency.`
        );
      }
    }

    // Determine condition type for the commitment
    const conditionType = parsedCommitment.condition.type;

    // Create the commitment
    const commitment = await prisma.commitment.create({
      data: {
        groupId,
        creatorId: userId,
        status: 'active',
        conditionType,
        naturalLanguageText,
        parsedCommitment: parsedCommitment as any, // Prisma Json type
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('Commitment created', { commitmentId: commitment.id, creatorId: userId, groupId });
    
    // Return commitment with warnings if any
    const response: any = commitment;
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    
    res.status(201).json(response);
  } catch (error) {
    logger.error('Create commitment error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create commitment',
    });
  }
});

/**
 * GET /api/commitments
 * Get all commitments with optional filters
 */
router.get('/', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Validate query parameters
    const validationResult = commitmentQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const { groupId, userId: filterUserId, status, page = 1, limit = 20 } = validationResult.data as CommitmentQueryInput;

    // Build where clause
    const where: any = {};

    // If groupId is specified, verify user is a member
    if (groupId) {
      const groupMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
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
      // If no groupId is specified, get commitments from all groups the user is a member of
      const userGroups = await prisma.groupMembership.findMany({
        where: { userId },
        select: { groupId: true },
      });

      where.groupId = {
        in: userGroups.map((g) => g.groupId),
      };
    }

    // Filter by userId if specified
    if (filterUserId) {
      where.creatorId = filterUserId;
    }

    // Filter by status if specified
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.commitment.count({ where });

    // Get commitments with pagination
    const commitments = await prisma.commitment.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      commitments,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    logger.error('List commitments error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to list commitments',
    });
  }
});

/**
 * GET /api/commitments/:id
 * Get a specific commitment
 */
router.get('/:id', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const commitment = await prisma.commitment.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!commitment) {
      res.status(404).json({
        error: 'Commitment not found',
      });
      return;
    }

    // Verify user is a member of the group
    const groupMembership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: commitment.groupId,
          userId,
        },
      },
    });

    if (!groupMembership) {
      res.status(403).json({
        error: 'You are not a member of this group',
      });
      return;
    }

    res.status(200).json(commitment);
  } catch (error) {
    logger.error('Get commitment error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get commitment',
    });
  }
});

/**
 * PUT /api/commitments/:id
 * Update a commitment (only creator can update)
 */
router.put('/:id', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Validate input
    const validationResult = updateCommitmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const { parsedCommitment, naturalLanguageText } = validationResult.data as UpdateCommitmentInput;

    // Get the commitment
    const commitment = await prisma.commitment.findUnique({
      where: { id },
    });

    if (!commitment) {
      res.status(404).json({
        error: 'Commitment not found',
      });
      return;
    }

    // Verify user is the creator
    if (commitment.creatorId !== userId) {
      res.status(403).json({
        error: 'Only the commitment creator can update it',
      });
      return;
    }

    // Verify commitment is active (cannot update revoked commitments)
    if (commitment.status !== 'active') {
      res.status(400).json({
        error: 'Cannot update a revoked commitment',
      });
      return;
    }

    // If parsedCommitment is provided and condition is single_user, verify the target user is a member
    if (parsedCommitment && parsedCommitment.condition.type === 'single_user' && parsedCommitment.condition.targetUserId) {
      const targetMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: commitment.groupId,
            userId: parsedCommitment.condition.targetUserId,
          },
        },
      });

      if (!targetMembership) {
        res.status(400).json({
          error: 'Target user is not a member of this group',
        });
        return;
      }
    }

    // Check for existing commitments with the same action but different units
    const warnings: string[] = [];
    if (parsedCommitment) {
      const existingCommitments = await prisma.commitment.findMany({
        where: {
          groupId: commitment.groupId,
          status: 'active',
          id: { not: id }, // Exclude current commitment
        },
      });

      const actionsToCheck = [];
      
      // Only check condition if it's not unconditional
      if (parsedCommitment.condition.type !== 'unconditional' && parsedCommitment.condition.action) {
        actionsToCheck.push({ 
          action: parsedCommitment.condition.action, 
          unit: parsedCommitment.condition.unit!, 
          type: 'condition' 
        });
      }
      
      actionsToCheck.push({ 
        action: parsedCommitment.promise.action, 
        unit: parsedCommitment.promise.unit, 
        type: 'promise' 
      });

      for (const { action, unit, type } of actionsToCheck) {
        // Find existing units for this action
        const existingUnits = new Set<string>();
        for (const existing of existingCommitments) {
          const parsed = existing.parsedCommitment as any;
          if (parsed.condition?.action === action && parsed.condition?.unit !== unit) {
            existingUnits.add(parsed.condition.unit);
          }
          if (parsed.promise?.action === action && parsed.promise?.unit !== unit) {
            existingUnits.add(parsed.promise.unit);
          }
        }

        if (existingUnits.size > 0) {
          const unitsList = Array.from(existingUnits).join(', ');
          warnings.push(
            `Action "${action}" in your ${type} uses unit "${unit}", but other commitments in this group use: ${unitsList}. ` +
            `Using different units will result in these being treated as separate actions. ` +
            `Consider using the existing unit(s) for consistency.`
          );
        }
      }
    }

    // Update the commitment
    const updateData: any = {};
    if (parsedCommitment) {
      updateData.parsedCommitment = parsedCommitment;
      updateData.conditionType = parsedCommitment.condition.type;
    }
    if (naturalLanguageText !== undefined) {
      updateData.naturalLanguageText = naturalLanguageText;
    }

    const updatedCommitment = await prisma.commitment.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('Commitment updated', { commitmentId: id, updatedBy: userId });
    
    // Return commitment with warnings if any
    const response: any = updatedCommitment;
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Update commitment error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update commitment',
    });
  }
});

/**
 * DELETE /api/commitments/:id
 * Revoke a commitment (only creator can revoke)
 */
router.delete('/:id', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Get the commitment
    const commitment = await prisma.commitment.findUnique({
      where: { id },
    });

    if (!commitment) {
      res.status(404).json({
        error: 'Commitment not found',
      });
      return;
    }

    // Verify user is the creator
    if (commitment.creatorId !== userId) {
      res.status(403).json({
        error: 'Only the commitment creator can revoke it',
      });
      return;
    }

    // Verify commitment is active (cannot revoke already revoked commitments)
    if (commitment.status !== 'active') {
      res.status(400).json({
        error: 'Commitment is already revoked',
      });
      return;
    }

    // Revoke the commitment (soft delete)
    const revokedCommitment = await prisma.commitment.update({
      where: { id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('Commitment revoked', { commitmentId: id, revokedBy: userId });
    res.status(200).json(revokedCommitment);
  } catch (error) {
    logger.error('Revoke commitment error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to revoke commitment',
    });
  }
});

export default router;
