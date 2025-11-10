import request from 'supertest';
import express, { Application } from 'express';
import { PrismaClient } from '@prisma/client';
import groupRoutes from './groups';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    group: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    groupMembership: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
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

describe('Group Routes', () => {
  let app: Application;
  let prisma: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/groups', groupRoutes);

    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('POST /api/groups', () => {
    it('should create a new group successfully', async () => {
      const newGroup = {
        name: 'Test Group',
        description: 'A test group',
      };

      const createdGroup = {
        id: 'group-123',
        name: newGroup.name,
        description: newGroup.description,
        creatorId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            id: 'membership-123',
            userId: 'user-123',
            role: 'creator',
            joinedAt: new Date(),
            user: {
              id: 'user-123',
              username: 'testuser',
              email: 'test@example.com',
            },
          },
        ],
      };

      prisma.group.create.mockResolvedValue(createdGroup);

      const response = await request(app)
        .post('/api/groups')
        .send(newGroup)
        .expect(201);

      expect(response.body).toHaveProperty('group');
      expect(response.body.group).toMatchObject({
        id: 'group-123',
        name: newGroup.name,
        description: newGroup.description,
      });
      expect(response.body.group.memberships).toHaveLength(1);
      expect(response.body.group.memberships[0].role).toBe('creator');
    });

    it('should reject group creation with missing name', async () => {
      const invalidGroup = {
        description: 'A test group',
      };

      const response = await request(app)
        .post('/api/groups')
        .send(invalidGroup)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(response.body).toHaveProperty('details');
    });

    it('should reject group creation with too long name', async () => {
      const invalidGroup = {
        name: 'a'.repeat(101), // More than 100 characters
        description: 'A test group',
      };

      const response = await request(app)
        .post('/api/groups')
        .send(invalidGroup)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('GET /api/groups', () => {
    it('should list all groups the user is a member of', async () => {
      const groups = [
        {
          id: 'group-1',
          name: 'Group 1',
          description: 'First group',
          creatorId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [
            {
              id: 'membership-1',
              userId: 'user-123',
              role: 'creator',
              user: {
                id: 'user-123',
                username: 'testuser',
                email: 'test@example.com',
              },
            },
          ],
        },
        {
          id: 'group-2',
          name: 'Group 2',
          description: 'Second group',
          creatorId: 'user-456',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [
            {
              id: 'membership-2',
              userId: 'user-123',
              role: 'member',
              user: {
                id: 'user-123',
                username: 'testuser',
                email: 'test@example.com',
              },
            },
          ],
        },
      ];

      prisma.group.findMany.mockResolvedValue(groups);

      const response = await request(app)
        .get('/api/groups')
        .expect(200);

      expect(response.body).toHaveProperty('groups');
      expect(response.body.groups).toHaveLength(2);
      expect(response.body.groups[0].name).toBe('Group 1');
      expect(response.body.groups[1].name).toBe('Group 2');
    });

    it('should return empty array if user is not a member of any group', async () => {
      prisma.group.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/groups')
        .expect(200);

      expect(response.body).toHaveProperty('groups');
      expect(response.body.groups).toHaveLength(0);
    });
  });

  describe('GET /api/groups/:id', () => {
    it('should get a specific group successfully', async () => {
      const group = {
        id: 'group-123',
        name: 'Test Group',
        description: 'A test group',
        creatorId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            id: 'membership-123',
            userId: 'user-123',
            role: 'creator',
            user: {
              id: 'user-123',
              username: 'testuser',
              email: 'test@example.com',
            },
          },
        ],
      };

      prisma.group.findUnique.mockResolvedValue(group);

      const response = await request(app)
        .get('/api/groups/group-123')
        .expect(200);

      expect(response.body).toHaveProperty('group');
      expect(response.body.group.id).toBe('group-123');
      expect(response.body.group.name).toBe('Test Group');
    });

    it('should return 404 if group does not exist', async () => {
      prisma.group.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/groups/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Group not found');
    });

    it('should return 403 if user is not a member of the group', async () => {
      const group = {
        id: 'group-123',
        name: 'Test Group',
        description: 'A test group',
        creatorId: 'user-456',
        memberships: [
          {
            id: 'membership-456',
            userId: 'user-456',
            role: 'creator',
            user: {
              id: 'user-456',
              username: 'otheruser',
              email: 'other@example.com',
            },
          },
        ],
      };

      prisma.group.findUnique.mockResolvedValue(group);

      const response = await request(app)
        .get('/api/groups/group-123')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
    });
  });

  describe('PUT /api/groups/:id', () => {
    it('should update a group successfully', async () => {
      const existingGroup = {
        id: 'group-123',
        name: 'Old Name',
        description: 'Old description',
        creatorId: 'user-123',
      };

      const updatedGroup = {
        id: 'group-123',
        name: 'New Name',
        description: 'New description',
        creatorId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            id: 'membership-123',
            userId: 'user-123',
            role: 'creator',
            user: {
              id: 'user-123',
              username: 'testuser',
              email: 'test@example.com',
            },
          },
        ],
      };

      prisma.group.findUnique.mockResolvedValue(existingGroup);
      prisma.group.update.mockResolvedValue(updatedGroup);

      const response = await request(app)
        .put('/api/groups/group-123')
        .send({ name: 'New Name', description: 'New description' })
        .expect(200);

      expect(response.body).toHaveProperty('group');
      expect(response.body.group.name).toBe('New Name');
      expect(response.body.group.description).toBe('New description');
    });

    it('should return 404 if group does not exist', async () => {
      prisma.group.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/groups/nonexistent')
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Group not found');
    });

    it('should return 403 if user is not the creator', async () => {
      const existingGroup = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-456', // Different from authenticated user
      };

      prisma.group.findUnique.mockResolvedValue(existingGroup);

      const response = await request(app)
        .put('/api/groups/group-123')
        .send({ name: 'New Name' })
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
    });
  });

  describe('DELETE /api/groups/:id', () => {
    it('should delete a group successfully', async () => {
      const existingGroup = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-123',
      };

      prisma.group.findUnique.mockResolvedValue(existingGroup);
      prisma.group.delete.mockResolvedValue(existingGroup);

      const response = await request(app)
        .delete('/api/groups/group-123')
        .expect(204);

      expect(response.body).toEqual({});
    });

    it('should return 404 if group does not exist', async () => {
      prisma.group.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/groups/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Group not found');
    });

    it('should return 403 if user is not the creator', async () => {
      const existingGroup = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-456',
      };

      prisma.group.findUnique.mockResolvedValue(existingGroup);

      const response = await request(app)
        .delete('/api/groups/group-123')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
    });
  });

  describe('POST /api/groups/:id/join', () => {
    it('should join a group successfully', async () => {
      const group = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-456',
      };

      const updatedGroup = {
        ...group,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            id: 'membership-456',
            userId: 'user-456',
            role: 'creator',
            user: {
              id: 'user-456',
              username: 'creator',
              email: 'creator@example.com',
            },
          },
          {
            id: 'membership-123',
            userId: 'user-123',
            role: 'member',
            user: {
              id: 'user-123',
              username: 'testuser',
              email: 'test@example.com',
            },
          },
        ],
      };

      prisma.group.findUnique.mockResolvedValueOnce(group).mockResolvedValueOnce(updatedGroup);
      prisma.groupMembership.findUnique.mockResolvedValue(null);
      prisma.groupMembership.create.mockResolvedValue({
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        role: 'member',
      });

      const response = await request(app)
        .post('/api/groups/group-123/join')
        .expect(200);

      expect(response.body).toHaveProperty('group');
      expect(response.body.group.memberships).toHaveLength(2);
    });

    it('should return 404 if group does not exist', async () => {
      prisma.group.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/groups/nonexistent/join')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Group not found');
    });

    it('should return 409 if user is already a member', async () => {
      const group = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-456',
      };

      const existingMembership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        role: 'member',
      };

      prisma.group.findUnique.mockResolvedValue(group);
      prisma.groupMembership.findUnique.mockResolvedValue(existingMembership);

      const response = await request(app)
        .post('/api/groups/group-123/join')
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Already a member');
    });
  });

  describe('POST /api/groups/:id/leave', () => {
    it('should leave a group successfully', async () => {
      const group = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-456', // Different from authenticated user
      };

      const membership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        role: 'member',
      };

      prisma.group.findUnique.mockResolvedValue(group);
      prisma.groupMembership.findUnique.mockResolvedValue(membership);
      prisma.groupMembership.delete.mockResolvedValue(membership);

      const response = await request(app)
        .post('/api/groups/group-123/leave')
        .expect(204);

      expect(response.body).toEqual({});
    });

    it('should return 404 if group does not exist', async () => {
      prisma.group.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/groups/nonexistent/leave')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Group not found');
    });

    it('should return 403 if user is the creator', async () => {
      const group = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-123', // Same as authenticated user
      };

      prisma.group.findUnique.mockResolvedValue(group);

      const response = await request(app)
        .post('/api/groups/group-123/leave')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
    });

    it('should return 404 if user is not a member', async () => {
      const group = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-456',
      };

      prisma.group.findUnique.mockResolvedValue(group);
      prisma.groupMembership.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/groups/group-123/leave')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not a member');
    });
  });

  describe('GET /api/groups/:id/members', () => {
    it('should get all members of a group', async () => {
      const group = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-456',
      };

      const membership = {
        id: 'membership-123',
        groupId: 'group-123',
        userId: 'user-123',
        role: 'member',
      };

      const members = [
        {
          id: 'membership-456',
          groupId: 'group-123',
          userId: 'user-456',
          role: 'creator',
          joinedAt: new Date(),
          user: {
            id: 'user-456',
            username: 'creator',
            email: 'creator@example.com',
          },
        },
        {
          id: 'membership-123',
          groupId: 'group-123',
          userId: 'user-123',
          role: 'member',
          joinedAt: new Date(),
          user: {
            id: 'user-123',
            username: 'testuser',
            email: 'test@example.com',
          },
        },
      ];

      prisma.group.findUnique.mockResolvedValue(group);
      prisma.groupMembership.findUnique.mockResolvedValue(membership);
      prisma.groupMembership.findMany.mockResolvedValue(members);

      const response = await request(app)
        .get('/api/groups/group-123/members')
        .expect(200);

      expect(response.body).toHaveProperty('members');
      expect(response.body.members).toHaveLength(2);
      expect(response.body.members[0].role).toBe('creator');
      expect(response.body.members[1].role).toBe('member');
    });

    it('should return 404 if group does not exist', async () => {
      prisma.group.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/groups/nonexistent/members')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Group not found');
    });

    it('should return 403 if user is not a member', async () => {
      const group = {
        id: 'group-123',
        name: 'Test Group',
        creatorId: 'user-456',
      };

      prisma.group.findUnique.mockResolvedValue(group);
      prisma.groupMembership.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/groups/group-123/members')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
    });
  });
});
