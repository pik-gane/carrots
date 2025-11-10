import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createGroupSchema, updateGroupSchema, CreateGroupInput, UpdateGroupInput } from '../utils/group/validation';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/authenticate';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/groups
 * Create a new group
 */
router.post('/', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = createGroupSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const { name, description } = validationResult.data as CreateGroupInput;
    const userId = req.user!.userId;

    // Create the group and add the creator as a member
    const group = await prisma.group.create({
      data: {
        name,
        description,
        creatorId: userId,
        memberships: {
          create: {
            userId,
            role: 'creator',
          },
        },
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    logger.info('Group created', { groupId: group.id, creatorId: userId, name });
    res.status(201).json({ group });
  } catch (error) {
    logger.error('Create group error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create group',
    });
  }
});

/**
 * GET /api/groups
 * Get all groups the authenticated user is a member of
 */
router.get('/', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const groups = await prisma.group.findMany({
      where: {
        memberships: {
          some: {
            userId,
          },
        },
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ groups });
  } catch (error) {
    logger.error('List groups error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to list groups',
    });
  }
});

/**
 * GET /api/groups/:id
 * Get a specific group by ID
 */
router.get('/:id', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({
        error: 'Group not found',
        message: 'Group does not exist',
      });
      return;
    }

    // Check if user is a member of the group
    const isMember = group.memberships.some((membership) => membership.userId === userId);
    if (!isMember) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
      return;
    }

    res.json({ group });
  } catch (error) {
    logger.error('Get group error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get group',
    });
  }
});

/**
 * PUT /api/groups/:id
 * Update a group (only the creator can update)
 */
router.put('/:id', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Validate input
    const validationResult = updateGroupSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    // Check if group exists and user is the creator
    const existingGroup = await prisma.group.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      res.status(404).json({
        error: 'Group not found',
        message: 'Group does not exist',
      });
      return;
    }

    if (existingGroup.creatorId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the group creator can update the group',
      });
      return;
    }

    const { name, description } = validationResult.data as UpdateGroupInput;

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    logger.info('Group updated', { groupId: id, userId });
    res.json({ group: updatedGroup });
  } catch (error) {
    logger.error('Update group error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update group',
    });
  }
});

/**
 * DELETE /api/groups/:id
 * Delete a group (only the creator can delete)
 */
router.delete('/:id', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if group exists and user is the creator
    const existingGroup = await prisma.group.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      res.status(404).json({
        error: 'Group not found',
        message: 'Group does not exist',
      });
      return;
    }

    if (existingGroup.creatorId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the group creator can delete the group',
      });
      return;
    }

    await prisma.group.delete({
      where: { id },
    });

    logger.info('Group deleted', { groupId: id, userId });
    res.status(204).send();
  } catch (error) {
    logger.error('Delete group error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete group',
    });
  }
});

/**
 * POST /api/groups/:id/join
 * Join a group
 */
router.post('/:id/join', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      res.status(404).json({
        error: 'Group not found',
        message: 'Group does not exist',
      });
      return;
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId,
        },
      },
    });

    if (existingMembership) {
      res.status(409).json({
        error: 'Already a member',
        message: 'You are already a member of this group',
      });
      return;
    }

    // Create membership
    await prisma.groupMembership.create({
      data: {
        groupId: id,
        userId,
        role: 'member',
      },
    });

    // Fetch updated group with all members
    const updatedGroup = await prisma.group.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    logger.info('User joined group', { groupId: id, userId });
    res.json({ group: updatedGroup });
  } catch (error) {
    logger.error('Join group error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to join group',
    });
  }
});

/**
 * POST /api/groups/:id/leave
 * Leave a group
 */
router.post('/:id/leave', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      res.status(404).json({
        error: 'Group not found',
        message: 'Group does not exist',
      });
      return;
    }

    // Check if user is the creator
    if (group.creatorId === userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Group creator cannot leave the group. Delete the group instead.',
      });
      return;
    }

    // Check if user is a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId,
        },
      },
    });

    if (!existingMembership) {
      res.status(404).json({
        error: 'Not a member',
        message: 'You are not a member of this group',
      });
      return;
    }

    // Delete membership
    await prisma.groupMembership.delete({
      where: {
        groupId_userId: {
          groupId: id,
          userId,
        },
      },
    });

    logger.info('User left group', { groupId: id, userId });
    res.status(204).send();
  } catch (error) {
    logger.error('Leave group error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to leave group',
    });
  }
});

/**
 * GET /api/groups/:id/members
 * Get all members of a group
 */
router.get('/:id/members', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      res.status(404).json({
        error: 'Group not found',
        message: 'Group does not exist',
      });
      return;
    }

    // Check if user is a member of the group
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
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

    // Get all members
    const members = await prisma.groupMembership.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    res.json({ members });
  } catch (error) {
    logger.error('Get group members error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get group members',
    });
  }
});

export default router;
