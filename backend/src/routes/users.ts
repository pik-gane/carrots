import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { updateUserSchema, UpdateUserInput } from '../utils/user/validation';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/authenticate';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/users/:id
 * Get user by ID (public profile info)
 */
router.get('/:id', apiRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist',
      });
      return;
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user',
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user profile (authenticated, can only update own profile)
 */
router.put('/:id', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Authorization check: users can only update their own profile
    if (!req.user || req.user.userId !== id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own profile',
      });
      return;
    }

    // Validate input
    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const updateData = validationResult.data as UpdateUserInput;

    // Check if username or email already exists (if being updated)
    if (updateData.username || updateData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateData.email ? { email: updateData.email } : {},
                updateData.username ? { username: updateData.username } : {},
              ].filter((condition) => Object.keys(condition).length > 0),
            },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email === updateData.email) {
          res.status(409).json({
            error: 'Conflict',
            message: 'Email already in use',
          });
          return;
        }
        if (existingUser.username === updateData.username) {
          res.status(409).json({
            error: 'Conflict',
            message: 'Username already taken',
          });
          return;
        }
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`User updated: ${updatedUser.email}`);

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Update user error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user',
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user account (authenticated, can only delete own account)
 */
router.delete('/:id', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Authorization check: users can only delete their own account
    if (!req.user || req.user.userId !== id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own account',
      });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist',
      });
      return;
    }

    // Delete user (cascading deletes will handle related records)
    await prisma.user.delete({
      where: { id },
    });

    logger.info(`User deleted: ${user.email}`);

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete user',
    });
  }
});

export default router;
