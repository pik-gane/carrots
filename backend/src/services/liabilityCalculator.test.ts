import { liabilityCalculator } from '../liabilityCalculator';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    commitment: {
      findMany: jest.fn(),
    },
    groupMembership: {
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('LiabilityCalculator', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateGroupLiabilities', () => {
    it('should return empty array when no commitments exist', async () => {
      prisma.commitment.findMany.mockResolvedValue([]);

      const result = await liabilityCalculator.calculateGroupLiabilities('group-1');

      expect(result).toEqual([]);
    });

    it('should calculate simple single-user conditional commitment', async () => {
      const groupId = 'group-1';
      const aliceId = 'user-alice';
      const bobId = 'user-bob';

      // Bob's commitment: "If Alice does 5 hours, I'll do 3 hours"
      prisma.commitment.findMany.mockResolvedValue([
        {
          id: 'commitment-1',
          groupId,
          creatorId: bobId,
          status: 'active',
          conditionType: 'single_user',
          parsedCommitment: {
            condition: {
              type: 'single_user',
              targetUserId: aliceId,
              action: 'work',
              minAmount: 5,
              unit: 'hours',
            },
            promise: {
              action: 'work',
              minAmount: 3,
              unit: 'hours',
            },
          },
          creator: {
            id: bobId,
            username: 'bob',
          },
        },
      ]);

      // Alice also has a commitment: "If others do 2 hours, I'll do 5 hours"
      prisma.commitment.findMany.mockResolvedValue([
        {
          id: 'commitment-1',
          groupId,
          creatorId: bobId,
          status: 'active',
          conditionType: 'single_user',
          parsedCommitment: {
            condition: {
              type: 'single_user',
              targetUserId: aliceId,
              action: 'work',
              minAmount: 5,
              unit: 'hours',
            },
            promise: {
              action: 'work',
              minAmount: 3,
              unit: 'hours',
            },
          },
          creator: { id: bobId, username: 'bob' },
        },
        {
          id: 'commitment-2',
          groupId,
          creatorId: aliceId,
          status: 'active',
          conditionType: 'aggregate',
          parsedCommitment: {
            condition: {
              type: 'aggregate',
              action: 'work',
              minAmount: 2,
              unit: 'hours',
            },
            promise: {
              action: 'work',
              minAmount: 5,
              unit: 'hours',
            },
          },
          creator: { id: aliceId, username: 'alice' },
        },
      ]);

      prisma.groupMembership.findMany.mockResolvedValue([
        { userId: aliceId },
        { userId: bobId },
      ]);

      const result = await liabilityCalculator.calculateGroupLiabilities(groupId);

      // Expected: Alice commits 5 hours, then Bob commits 3 hours (since Alice >= 5)
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: aliceId,
            action: 'work',
            amount: 5,
          }),
          expect.objectContaining({
            userId: bobId,
            action: 'work',
            amount: 3,
          }),
        ])
      );
    });

    it('should handle aggregate conditions', async () => {
      const groupId = 'group-1';
      const userIds = ['user-1', 'user-2', 'user-3'];

      // User-1: "If others do 10 total hours, I'll do 5 hours"
      prisma.commitment.findMany.mockResolvedValue([
        {
          id: 'commitment-1',
          groupId,
          creatorId: userIds[0],
          status: 'active',
          conditionType: 'aggregate',
          parsedCommitment: {
            condition: {
              type: 'aggregate',
              action: 'work',
              minAmount: 10,
              unit: 'hours',
            },
            promise: {
              action: 'work',
              minAmount: 5,
              unit: 'hours',
            },
          },
          creator: { id: userIds[0], username: 'user1' },
        },
      ]);

      prisma.groupMembership.findMany.mockResolvedValue(
        userIds.map((id) => ({ userId: id }))
      );

      const result = await liabilityCalculator.calculateGroupLiabilities(groupId);

      // Without other commitments, aggregate condition (10 hours) is not met
      // So user-1 has no liability
      expect(result).toEqual([]);
    });
  });
});
