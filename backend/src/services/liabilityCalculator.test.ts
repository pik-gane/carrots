import { liabilityCalculator } from './liabilityCalculator';
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
            conditions: [{
              targetUserId: aliceId,
              action: 'work',
              minAmount: 5,
              unit: 'hours',
            }],
            promises: [{
              action: 'work',
              baseAmount: 3,
              proportionalAmount: 0,
              unit: 'hours',
            }],
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
            conditions: [{
              targetUserId: aliceId,
              action: 'work',
              minAmount: 5,
              unit: 'hours',
            }],
            promises: [{
              action: 'work',
              baseAmount: 3,
              proportionalAmount: 0,
              unit: 'hours',
            }],
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
            conditions: [{
              targetUserId: bobId,
              action: 'work',
              minAmount: 2,
              unit: 'hours',
            }],
            promises: [{
              action: 'work',
              baseAmount: 5,
              proportionalAmount: 0,
              unit: 'hours',
            }],
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
            conditions: [{
              targetUserId: userIds[1],
              action: 'work',
              minAmount: 10,
              unit: 'hours',
            }],
            promises: [{
              action: 'work',
              baseAmount: 5,
              proportionalAmount: 0,
              unit: 'hours',
            }],
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

    it('should handle proportional matching promises', async () => {
      const groupId = 'group-1';
      const aliceId = 'user-alice';
      const bobId = 'user-bob';
      const charlieId = 'user-charlie';

      // Alice's commitment: Unconditional 10 hours
      // Bob's commitment: If Alice does >= 5 hours, I'll do 2 hours base + 0.5x (Alice - 5) up to 5 hours max
      // Charlie's commitment: If Alice does >= 5 hours, I'll do 3 hours base
      prisma.commitment.findMany.mockResolvedValue([
        {
          id: 'commitment-alice',
          groupId,
          creatorId: aliceId,
          status: 'active',
          conditionType: 'single_user',
          parsedCommitment: {
            conditions: [{
              targetUserId: aliceId,
              action: 'anything',
              minAmount: 0,
              unit: 'hours',
            }],
            promises: [{
              action: 'work',
              baseAmount: 10,
              proportionalAmount: 0,
              unit: 'hours',
            }],
          },
          creator: { id: aliceId, username: 'alice' },
        },
        {
          id: 'commitment-bob',
          groupId,
          creatorId: bobId,
          status: 'active',
          conditionType: 'single_user',
          parsedCommitment: {
            conditions: [{
              targetUserId: aliceId,
              action: 'work',
              minAmount: 5,
              unit: 'hours',
            }],
            promises: [{
              action: 'work',
              baseAmount: 2,
              proportionalAmount: 0.5,
              referenceUserId: aliceId,
              referenceAction: 'work',
              thresholdAmount: 5,
              maxAmount: 5,
              unit: 'hours',
            }],
          },
          creator: { id: bobId, username: 'bob' },
        },
        {
          id: 'commitment-charlie',
          groupId,
          creatorId: charlieId,
          status: 'active',
          conditionType: 'single_user',
          parsedCommitment: {
            conditions: [{
              targetUserId: aliceId,
              action: 'work',
              minAmount: 5,
              unit: 'hours',
            }],
            promises: [{
              action: 'work',
              baseAmount: 3,
              proportionalAmount: 0,
              unit: 'hours',
            }],
          },
          creator: { id: charlieId, username: 'charlie' },
        },
      ]);

      prisma.groupMembership.findMany.mockResolvedValue([
        { userId: aliceId },
        { userId: bobId },
        { userId: charlieId },
      ]);

      const result = await liabilityCalculator.calculateGroupLiabilities(groupId);

      // Alice commits 10 hours unconditionally
      // Bob sees Alice at 10 hours, so: 2 + min(5, 0.5 * (10 - 5)) = 2 + min(5, 2.5) = 4.5 hours
      // Charlie sees Alice at 10 hours >= 5, so: 3 hours
      expect(result).toHaveLength(3);
      
      const aliceLiability = result.find(r => r.userId === aliceId && r.action === 'work');
      const bobLiability = result.find(r => r.userId === bobId && r.action === 'work');
      const charlieLiability = result.find(r => r.userId === charlieId && r.action === 'work');
      
      expect(aliceLiability?.amount).toBe(10);
      expect(bobLiability?.amount).toBe(4.5);
      expect(charlieLiability?.amount).toBe(3);
    });
  });
});
