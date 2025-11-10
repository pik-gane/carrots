import request from 'supertest';
import express, { Application } from 'express';
import { PrismaClient } from '@prisma/client';
import commitmentRoutes from './commitments';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    commitment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    groupMembership: {
      findUnique: jest.fn(),
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

describe('Commitment Routes', () => {
  let app: Application;
  let prisma: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/commitments', commitmentRoutes);

    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('POST /api/commitments', () => {
    it('should create a new commitment with single_user condition', async () => {
      const newCommitment = {
        groupId: 'group-123',
        parsedCommitment: {
          condition: {
            type: 'single_user',
            targetUserId: 'user-456',
            action: 'work',
            minAmount: 5,
            unit: 'hours',
          },
          promise: {
            action: 'help',
            minAmount: 3,
            unit: 'hours',
          },
        },
        naturalLanguageText: 'If user-456 does at least 5 hours of work, I will do at least 3 hours of help',
      };

      const groupMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        role: 'member',
        group: { id: 'group-123', name: 'Test Group' },
      };

      const targetMembership = {
        id: 'membership-456',
        groupId: 'group-123',
        userId: 'user-456',
        role: 'member',
      };

      const createdCommitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-123',
        status: 'active',
        conditionType: 'single_user',
        naturalLanguageText: newCommitment.naturalLanguageText,
        parsedCommitment: newCommitment.parsedCommitment,
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        creator: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
        },
        group: {
          id: 'group-123',
          name: 'Test Group',
        },
      };

      prisma.groupMembership.findUnique.mockResolvedValueOnce(groupMembership);
      prisma.groupMembership.findUnique.mockResolvedValueOnce(targetMembership);
      prisma.commitment.create.mockResolvedValue(createdCommitment);

      const response = await request(app)
        .post('/api/commitments')
        .send(newCommitment)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('active');
      expect(response.body.conditionType).toBe('single_user');
    });

    it('should create a new commitment with aggregate condition', async () => {
      const newCommitment = {
        groupId: 'group-123',
        parsedCommitment: {
          condition: {
            type: 'aggregate',
            action: 'work',
            minAmount: 10,
            unit: 'hours',
          },
          promise: {
            action: 'help',
            minAmount: 5,
            unit: 'hours',
          },
        },
      };

      const groupMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        role: 'member',
        group: { id: 'group-123', name: 'Test Group' },
      };

      const createdCommitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-123',
        status: 'active',
        conditionType: 'aggregate',
        naturalLanguageText: null,
        parsedCommitment: newCommitment.parsedCommitment,
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        creator: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
        },
        group: {
          id: 'group-123',
          name: 'Test Group',
        },
      };

      prisma.groupMembership.findUnique.mockResolvedValueOnce(groupMembership);
      prisma.commitment.create.mockResolvedValue(createdCommitment);

      const response = await request(app)
        .post('/api/commitments')
        .send(newCommitment)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('active');
      expect(response.body.conditionType).toBe('aggregate');
    });

    it('should reject commitment if user is not a group member', async () => {
      const newCommitment = {
        groupId: 'group-123',
        parsedCommitment: {
          condition: {
            type: 'aggregate',
            action: 'work',
            minAmount: 10,
            unit: 'hours',
          },
          promise: {
            action: 'help',
            minAmount: 5,
            unit: 'hours',
          },
        },
      };

      prisma.groupMembership.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/commitments')
        .send(newCommitment)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not a member');
    });

    it('should reject commitment if target user is not a group member', async () => {
      const newCommitment = {
        groupId: 'group-123',
        parsedCommitment: {
          condition: {
            type: 'single_user',
            targetUserId: 'user-999',
            action: 'work',
            minAmount: 5,
            unit: 'hours',
          },
          promise: {
            action: 'help',
            minAmount: 3,
            unit: 'hours',
          },
        },
      };

      const groupMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        role: 'member',
        group: { id: 'group-123', name: 'Test Group' },
      };

      prisma.groupMembership.findUnique.mockResolvedValueOnce(groupMembership);
      prisma.groupMembership.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/commitments')
        .send(newCommitment)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not a member');
    });

    it('should reject commitment with invalid data', async () => {
      const invalidCommitment = {
        groupId: 'invalid-uuid',
        parsedCommitment: {
          condition: {
            type: 'invalid-type',
            action: 'work',
            minAmount: -5,
            unit: 'hours',
          },
          promise: {
            action: 'help',
            minAmount: 3,
            unit: 'hours',
          },
        },
      };

      const response = await request(app)
        .post('/api/commitments')
        .send(invalidCommitment)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Validation error');
    });
  });

  describe('GET /api/commitments', () => {
    it('should list commitments for user groups', async () => {
      const userGroups = [
        { groupId: 'group-123' },
        { groupId: 'group-456' },
      ];

      const commitments = [
        {
          id: 'commitment-123',
          groupId: 'group-123',
          creatorId: 'user-123',
          status: 'active',
          conditionType: 'single_user',
          parsedCommitment: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: {
            id: 'user-123',
            username: 'testuser',
            email: 'test@example.com',
          },
          group: {
            id: 'group-123',
            name: 'Test Group',
          },
        },
      ];

      prisma.groupMembership.findMany.mockResolvedValue(userGroups);
      prisma.commitment.count.mockResolvedValue(1);
      prisma.commitment.findMany.mockResolvedValue(commitments);

      const response = await request(app)
        .get('/api/commitments')
        .expect(200);

      expect(response.body).toHaveProperty('commitments');
      expect(response.body.commitments).toHaveLength(1);
      expect(response.body).toHaveProperty('total', 1);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('totalPages', 1);
    });

    it('should filter commitments by groupId', async () => {
      const groupMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
      };

      const commitments = [
        {
          id: 'commitment-123',
          groupId: 'group-123',
          creatorId: 'user-456',
          status: 'active',
          conditionType: 'aggregate',
          parsedCommitment: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: {
            id: 'user-456',
            username: 'otheruser',
            email: 'other@example.com',
          },
          group: {
            id: 'group-123',
            name: 'Test Group',
          },
        },
      ];

      prisma.groupMembership.findUnique.mockResolvedValue(groupMembership);
      prisma.commitment.count.mockResolvedValue(1);
      prisma.commitment.findMany.mockResolvedValue(commitments);

      const response = await request(app)
        .get('/api/commitments?groupId=group-123')
        .expect(200);

      expect(response.body.commitments).toHaveLength(1);
      expect(response.body.commitments[0].groupId).toBe('group-123');
    });

    it('should filter commitments by status', async () => {
      const userGroups = [{ groupId: 'group-123' }];

      prisma.groupMembership.findMany.mockResolvedValue(userGroups);
      prisma.commitment.count.mockResolvedValue(0);
      prisma.commitment.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/commitments?status=revoked')
        .expect(200);

      expect(response.body.commitments).toHaveLength(0);
    });

    it('should reject if user is not a member of specified group', async () => {
      prisma.groupMembership.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/commitments?groupId=group-999')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not a member');
    });
  });

  describe('GET /api/commitments/:id', () => {
    it('should get a specific commitment', async () => {
      const commitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-123',
        status: 'active',
        conditionType: 'single_user',
        parsedCommitment: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
        },
        group: {
          id: 'group-123',
          name: 'Test Group',
        },
      };

      const groupMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
      };

      prisma.commitment.findUnique.mockResolvedValue(commitment);
      prisma.groupMembership.findUnique.mockResolvedValue(groupMembership);

      const response = await request(app)
        .get('/api/commitments/commitment-123')
        .expect(200);

      expect(response.body).toHaveProperty('id', 'commitment-123');
    });

    it('should return 404 for non-existent commitment', async () => {
      prisma.commitment.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/commitments/commitment-999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should reject if user is not a group member', async () => {
      const commitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-456',
        status: 'active',
      };

      prisma.commitment.findUnique.mockResolvedValue(commitment);
      prisma.groupMembership.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/commitments/commitment-123')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not a member');
    });
  });

  describe('PUT /api/commitments/:id', () => {
    it('should update a commitment', async () => {
      const commitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-123',
        status: 'active',
        conditionType: 'single_user',
      };

      const updateData = {
        parsedCommitment: {
          condition: {
            type: 'single_user',
            targetUserId: 'user-456',
            action: 'work',
            minAmount: 10,
            unit: 'hours',
          },
          promise: {
            action: 'help',
            minAmount: 5,
            unit: 'hours',
          },
        },
      };

      const targetMembership = {
        id: 'membership-456',
        groupId: 'group-123',
        userId: 'user-456',
      };

      const updatedCommitment = {
        ...commitment,
        ...updateData,
        updatedAt: new Date(),
        creator: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
        },
        group: {
          id: 'group-123',
          name: 'Test Group',
        },
      };

      prisma.commitment.findUnique.mockResolvedValue(commitment);
      prisma.groupMembership.findUnique.mockResolvedValue(targetMembership);
      prisma.commitment.update.mockResolvedValue(updatedCommitment);

      const response = await request(app)
        .put('/api/commitments/commitment-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'commitment-123');
    });

    it('should reject update if user is not the creator', async () => {
      const commitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-456',
        status: 'active',
      };

      prisma.commitment.findUnique.mockResolvedValue(commitment);

      const response = await request(app)
        .put('/api/commitments/commitment-123')
        .send({ naturalLanguageText: 'Updated text' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('creator');
    });

    it('should reject update of revoked commitment', async () => {
      const commitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-123',
        status: 'revoked',
      };

      prisma.commitment.findUnique.mockResolvedValue(commitment);

      const response = await request(app)
        .put('/api/commitments/commitment-123')
        .send({ naturalLanguageText: 'Updated text' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('revoked');
    });
  });

  describe('DELETE /api/commitments/:id', () => {
    it('should revoke a commitment', async () => {
      const commitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-123',
        status: 'active',
      };

      const revokedCommitment = {
        ...commitment,
        status: 'revoked',
        revokedAt: new Date(),
        creator: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
        },
        group: {
          id: 'group-123',
          name: 'Test Group',
        },
      };

      prisma.commitment.findUnique.mockResolvedValue(commitment);
      prisma.commitment.update.mockResolvedValue(revokedCommitment);

      const response = await request(app)
        .delete('/api/commitments/commitment-123')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'revoked');
      expect(response.body).toHaveProperty('revokedAt');
    });

    it('should reject revoke if user is not the creator', async () => {
      const commitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-456',
        status: 'active',
      };

      prisma.commitment.findUnique.mockResolvedValue(commitment);

      const response = await request(app)
        .delete('/api/commitments/commitment-123')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('creator');
    });

    it('should reject revoke of already revoked commitment', async () => {
      const commitment = {
        id: 'commitment-123',
        groupId: 'group-123',
        creatorId: 'user-123',
        status: 'revoked',
      };

      prisma.commitment.findUnique.mockResolvedValue(commitment);

      const response = await request(app)
        .delete('/api/commitments/commitment-123')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already revoked');
    });
  });
});
