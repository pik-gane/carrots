import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/auth/password';
import { generateTokenPair, verifyToken } from '../utils/auth/jwt';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
} from '../utils/auth/validation';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/authenticate';
import { authRateLimiter, apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const { username, email, password } = validationResult.data as RegisterInput;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        res.status(409).json({
          error: 'User already exists',
          message: 'Email already registered',
        });
        return;
      }
      if (existingUser.username === username) {
        res.status(409).json({
          error: 'User already exists',
          message: 'Username already taken',
        });
        return;
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.email);

    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      ...tokens,
    });
  } catch (error) {
    logger.error('Registration error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to register user',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const { email: emailOrUsername, password } = validationResult.data as LoginInput;

    // Find user by email or username
    // First, check if the input looks like an email
    const isEmail = emailOrUsername.includes('@');
    
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: emailOrUsername.toLowerCase() }
        : {
            OR: [
              { username: emailOrUsername },
              { email: emailOrUsername.toLowerCase() },
            ],
          },
    });

    if (!user) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.email);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      ...tokens,
    });
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to login',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = refreshTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
      return;
    }

    const { refreshToken } = validationResult.data as RefreshTokenInput;

    // Verify refresh token
    const payload = verifyToken(refreshToken);

    if (payload.type !== 'refresh') {
      res.status(401).json({
        error: 'Invalid token type',
        message: 'Refresh token required',
      });
      return;
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'Invalid refresh token',
      });
      return;
    }

    // Generate new token pair
    const tokens = generateTokenPair(user.id, user.email);

    res.json({
      message: 'Token refreshed successfully',
      ...tokens,
    });
  } catch (error) {
    logger.error('Token refresh error', { error });
    res.status(401).json({
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Invalid refresh token',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 * This endpoint mainly serves as a marker for the client to remove tokens
 */
router.post('/logout', apiRateLimiter, authenticate, async (_req: Request, res: Response) => {
  res.json({
    message: 'Logout successful',
  });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', apiRateLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
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
      message: 'Failed to get user info',
    });
  }
});

export default router;
