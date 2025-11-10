import request from 'supertest';
import express, { Application } from 'express';
import { PrismaClient } from '@prisma/client';
import liabilityRoutes from './liabilities';

// Mock SimpleLiabilityCalculator
jest.mock('../services/simpleLiabilityCalculator', () => {
  return {
    SimpleLiabilityCalculator: jest.fn().mockImplementation(() => ({
      calculateGroupLiabilities: jest.fn(),
    })),
  };
});

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    groupMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    liability: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock authenticate middleware
jest.mock('../middleware/authenticate', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = { userId: 'user-123', email: 'test@example.com', type: 'access' };
    next();
  }),
}));

describe('Liability Routes', () => {
  let app: Application;
  let prisma: any;
  let mockCalculator: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', liabilityRoutes);

    prisma = new PrismaClient();
    const { SimpleLiabilityCalculator } = require('../services/simpleLiabilityCalculator');
    mockCalculator = new SimpleLiabilityCalculator();
    jest.clearAllMocks();
  });

  describe('GET /api/groups/:id/liabilities', () => {
    it('should calculate and return group liabilities', async () => {
      const groupMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        role: 'member',
        group: {
          id: 'group-123',
          name: 'Test Group',
        },
      };

      const calculatedLiabilities = [
        {
          userId: 'user-123',
          username: 'testuser',
          action: 'work',
          amount: 5,
          unit: 'hours',
          effectiveCommitmentIds: ['commitment-123'],
        },
        {
          userId: 'user-456',
          username: 'otheruser',
          action: 'help',
          amount: 3,
          unit: 'hours',
          effectiveCommitmentIds: ['commitment-456'],
        },
      ];

      prisma.groupMembership.findUnique.mockResolvedValue(groupMembership);
      mockCalculator.calculateGroupLiabilities.mockResolvedValue(calculatedLiabilities);
      prisma.liability.deleteMany.mockResolvedValue({ count: 0 });
      prisma.liability.createMany.mockResolvedValue({ count: 2 });

      const response = await request(app)
        .get('/api/groups/group-123/liabilities')
        .expect(200);

      expect(response.body).toHaveProperty('liabilities');
      expect(response.body).toHaveProperty('calculatedAt');
      expect(response.body.liabilities).toHaveLength(2);
      expect(response.body.liabilities[0]).toMatchObject({
        userId: 'user-123',
        username: 'testuser',
        action: 'work',
        amount: 5,
        unit: 'hours',
      });
      expect(mockCalculator.calculateGroupLiabilities).toHaveBeenCalledWith('group-123');
    });

    it('should return empty liabilities for group with no commitments', async () => {
      const groupMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        group: {
          id: 'group-123',
          name: 'Test Group',
        },
      };

      prisma.groupMembership.findUnique.mockResolvedValue(groupMembership);
      mockCalculator.calculateGroupLiabilities.mockResolvedValue([]);
      prisma.liability.deleteMany.mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get('/api/groups/group-123/liabilities')
        .expect(200);

      expect(response.body.liabilities).toHaveLength(0);
    });

    it('should reject if user is not a group member', async () => {
      prisma.groupMembership.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/groups/group-999/liabilities')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not a member');
    });

    it('should handle calculation errors', async () => {
      const groupMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        group: {
          id: 'group-123',
          name: 'Test Group',
        },
      };

      prisma.groupMembership.findUnique.mockResolvedValue(groupMembership);
      mockCalculator.calculateGroupLiabilities.mockRejectedValue(
        new Error('Liability calculation did not converge')
      );

      const response = await request(app)
        .get('/api/groups/group-123/liabilities')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('did not converge');
    });
  });

  describe('GET /api/users/:id/liabilities', () => {
    it('should return own liabilities', async () => {
      const sharedGroups = [
        { groupId: 'group-123' },
        { groupId: 'group-456' },
      ];

      const liabilities = [
        {
          id: 'liability-123',
          groupId: 'group-123',
          userId: 'user-123',
          action: 'work',
          amount: 5,
          unit: 'hours',
          calculatedAt: new Date(),
          effectiveCommitmentIds: ['commitment-123'],
          group: {
            id: 'group-123',
            name: 'Test Group',
          },
        },
      ];

      prisma.groupMembership.findMany.mockResolvedValue(sharedGroups);
      prisma.liability.findMany.mockResolvedValue(liabilities);

      const response = await request(app)
        .get('/api/users/user-123/liabilities')
        .expect(200);

      expect(response.body).toHaveProperty('liabilities');
      expect(response.body.liabilities).toHaveLength(1);
      expect(response.body.liabilities[0]).toMatchObject({
        groupId: 'group-123',
        groupName: 'Test Group',
        action: 'work',
        amount: 5,
        unit: 'hours',
      });
    });

    it('should filter liabilities by groupId', async () => {
      const groupMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
      };

      const liabilities = [
        {
          id: 'liability-123',
          groupId: 'group-123',
          userId: 'user-456',
          action: 'work',
          amount: 5,
          unit: 'hours',
          calculatedAt: new Date(),
          effectiveCommitmentIds: ['commitment-123'],
          group: {
            id: 'group-123',
            name: 'Test Group',
          },
        },
      ];

      prisma.groupMembership.findUnique.mockResolvedValue(groupMembership);
      prisma.liability.findMany.mockResolvedValue(liabilities);

      const response = await request(app)
        .get('/api/users/user-456/liabilities?groupId=group-123')
        .expect(200);

      expect(response.body.liabilities).toHaveLength(1);
      expect(response.body.liabilities[0].groupId).toBe('group-123');
    });

    it('should reject viewing liabilities of non-shared users', async () => {
      prisma.groupMembership.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/users/user-999/liabilities')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('only view liabilities of users in your groups');
    });

    it('should reject if user is not member of specified group', async () => {
      prisma.groupMembership.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/user-456/liabilities?groupId=group-999')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not a member');
    });
  });
});
