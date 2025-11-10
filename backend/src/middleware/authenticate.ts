import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/auth/jwt';
import { logger } from '../utils/logger';

// Extend Express Request to include user info
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Middleware to authenticate requests using JWT tokens
 * Expects token in Authorization header as "Bearer <token>"
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No authorization header provided',
      });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Invalid authorization header',
        message: 'Format should be: Bearer <token>',
      });
      return;
    }

    const token = parts[1];
    const payload = verifyToken(token);

    // Ensure it's an access token
    if (payload.type !== 'access') {
      res.status(401).json({
        error: 'Invalid token type',
        message: 'Access token required',
      });
      return;
    }

    // Attach user info to request
    req.user = payload;
    next();
  } catch (error) {
    logger.debug('Authentication failed', { error });
    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const payload = verifyToken(token);

      if (payload.type === 'access') {
        req.user = payload;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional authentication failed', { error });
  }

  next();
}
