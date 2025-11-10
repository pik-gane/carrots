import request from 'supertest';
import express, { Application } from 'express';
import { PrismaClient } from '@prisma/client';
import userRoutes from './users';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock authenticate middleware
jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Simple mock: extract userId from token format "token-{userId}"
      const userId = token.replace('token-', '');
      req.user = { userId, email: 'test@example.com' };
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  },
}));

describe('User Routes', () => {
  let app: Application;
  let prisma: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);

    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID successfully', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/user-123')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        id: 'user-123',
        username: 'testuser',
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          username: true,
          createdAt: true,
        },
      });
    });

    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/nonexistent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        username: 'newusername',
      };

      const updatedUser = {
        id: 'user-123',
        username: 'newusername',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer token-user-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'User updated successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        id: 'user-123',
        username: 'newusername',
      });
    });

    it('should reject update without authentication', async () => {
      const updateData = {
        username: 'newusername',
      };

      await request(app)
        .put('/api/users/user-123')
        .send(updateData)
        .expect(401);
    });

    it('should reject update to another user\'s profile', async () => {
      const updateData = {
        username: 'newusername',
      };

      const response = await request(app)
        .put('/api/users/user-456')
        .set('Authorization', 'Bearer token-user-123')
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body).toHaveProperty('message', 'You can only update your own profile');
    });

    it('should reject update with invalid username', async () => {
      const updateData = {
        username: 'ab', // Too short
      };

      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer token-user-123')
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should reject update with invalid email', async () => {
      const updateData = {
        email: 'invalid-email',
      };

      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer token-user-123')
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should reject update if username already taken', async () => {
      const updateData = {
        username: 'existinguser',
      };

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-456',
        username: 'existinguser',
        email: 'other@example.com',
      });

      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer token-user-123')
        .send(updateData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Conflict');
      expect(response.body).toHaveProperty('message', 'Username already taken');
    });

    it('should reject update if email already in use', async () => {
      const updateData = {
        email: 'existing@example.com',
      };

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-456',
        username: 'otheruser',
        email: 'existing@example.com',
      });

      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer token-user-123')
        .send(updateData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Conflict');
      expect(response.body).toHaveProperty('message', 'Email already in use');
    });

    it('should allow updating both username and email simultaneously', async () => {
      const updateData = {
        username: 'newusername',
        email: 'newemail@example.com',
      };

      const updatedUser = {
        id: 'user-123',
        username: 'newusername',
        email: 'newemail@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer token-user-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'User updated successfully');
      expect(response.body.user).toMatchObject({
        username: 'newusername',
        email: 'newemail@example.com',
      });
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user account successfully', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.delete.mockResolvedValue(mockUser);

      const response = await request(app)
        .delete('/api/users/user-123')
        .set('Authorization', 'Bearer token-user-123')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'User deleted successfully');
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should reject delete without authentication', async () => {
      await request(app)
        .delete('/api/users/user-123')
        .expect(401);
    });

    it('should reject delete of another user\'s account', async () => {
      const response = await request(app)
        .delete('/api/users/user-456')
        .set('Authorization', 'Bearer token-user-123')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body).toHaveProperty('message', 'You can only delete your own account');
    });

    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/users/nonexistent-id')
        .set('Authorization', 'Bearer token-nonexistent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });
});
