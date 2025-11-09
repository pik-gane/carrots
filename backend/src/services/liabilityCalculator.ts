import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  ParsedCommitment,
  LiabilityMap,
  CalculatedLiability,
  CommitmentWithRelations,
} from '../types';

const prisma = new PrismaClient();

/**
 * LiabilityCalculator - Core engine for calculating liabilities based on conditional commitments
 * 
 * Implements fixed-point algorithm from the game-theoretic framework:
 * L_i(a) = max { c_i(a, C_j) | j ∈ commitments, condition(C_j) is satisfied }
 */
export class LiabilityCalculator {
  private static readonly MAX_ITERATIONS = 100;
  private static readonly CONVERGENCE_THRESHOLD = 0.001;

  /**
   * Calculate liabilities for all users in a group
   */
  async calculateGroupLiabilities(groupId: string): Promise<CalculatedLiability[]> {
    logger.info(`Calculating liabilities for group ${groupId}`);

    // Get all active commitments for the group
    const commitments = await this.getActiveCommitments(groupId);
    logger.debug(`Found ${commitments.length} active commitments`);

    if (commitments.length === 0) {
      return [];
    }

    // Get all group members
    const members = await this.getGroupMembers(groupId);
    const userIds = members.map((m) => m.userId);

    // Extract all unique actions
    const actions = this.extractUniqueActions(commitments);

    // Initialize liabilities to zero
    let liabilities = this.initializeLiabilities(userIds, actions);

    // Fixed-point iteration
    let previousLiabilities: LiabilityMap | null = null;
    let iterations = 0;

    while (
      !this.hasConverged(liabilities, previousLiabilities) &&
      iterations < LiabilityCalculator.MAX_ITERATIONS
    ) {
      previousLiabilities = this.deepCopyLiabilities(liabilities);

      for (const commitment of commitments) {
        const conditionMet = this.evaluateCondition(
          commitment.parsedCommitment.condition,
          liabilities
        );

        if (conditionMet) {
          const userId = commitment.creatorId;
          const promise = commitment.parsedCommitment.promise;
          const action = promise.action;
          const amount = promise.minAmount;

          // Update liability: take maximum of current and promised amount
          if (!liabilities[userId][action]) {
            liabilities[userId][action] = {
              amount: 0,
              unit: promise.unit,
              effectiveCommitmentIds: [],
            };
          }

          if (amount > liabilities[userId][action].amount) {
            liabilities[userId][action].amount = amount;
            liabilities[userId][action].effectiveCommitmentIds = [commitment.id];
          } else if (amount === liabilities[userId][action].amount) {
            // Track all commitments that contribute to this liability
            if (!liabilities[userId][action].effectiveCommitmentIds.includes(commitment.id)) {
              liabilities[userId][action].effectiveCommitmentIds.push(commitment.id);
            }
          }
        }
      }

      iterations++;
    }

    if (iterations >= LiabilityCalculator.MAX_ITERATIONS) {
      logger.warn(`Liability calculation did not converge after ${iterations} iterations`);
      throw new Error('Liability calculation did not converge');
    }

    logger.info(`Liability calculation converged after ${iterations} iterations`);

    // Convert to array format
    return this.liabilityMapToArray(liabilities);
  }

  /**
   * Evaluate if a commitment condition is satisfied
   */
  private evaluateCondition(
    condition: ParsedCommitment['condition'],
    currentLiabilities: LiabilityMap
  ): boolean {
    if (condition.type === 'single_user') {
      if (!condition.targetUserId) {
        logger.error('single_user condition missing targetUserId');
        return false;
      }

      const userId = condition.targetUserId;
      const action = condition.action;
      const minAmount = condition.minAmount;

      const userLiability = currentLiabilities[userId]?.[action]?.amount || 0;
      return userLiability >= minAmount;
    } else if (condition.type === 'aggregate') {
      const action = condition.action;
      const minAmount = condition.minAmount;

      // Sum liabilities across all users for this action
      const totalLiability = Object.values(currentLiabilities).reduce(
        (sum, userActions) => sum + (userActions[action]?.amount || 0),
        0
      );

      return totalLiability >= minAmount;
    }

    return false;
  }

  /**
   * Get active commitments for a group
   */
  private async getActiveCommitments(groupId: string): Promise<CommitmentWithRelations[]> {
    const commitments = await prisma.commitment.findMany({
      where: {
        groupId,
        status: 'active',
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return commitments.map((c) => ({
      ...c,
      parsedCommitment: c.parsedCommitment as unknown as ParsedCommitment,
    }));
  }

  /**
   * Get group members
   */
  private async getGroupMembers(groupId: string) {
    return prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });
  }

  /**
   * Extract all unique actions from commitments
   */
  private extractUniqueActions(commitments: CommitmentWithRelations[]): string[] {
    const actions = new Set<string>();

    for (const commitment of commitments) {
      const parsed = commitment.parsedCommitment;
      actions.add(parsed.condition.action);
      actions.add(parsed.promise.action);
    }

    return Array.from(actions);
  }

  /**
   * Initialize liabilities to zero for all users and actions
   */
  private initializeLiabilities(userIds: string[], actions: string[]): LiabilityMap {
    const liabilities: LiabilityMap = {};

    for (const userId of userIds) {
      liabilities[userId] = {};
      for (const action of actions) {
        liabilities[userId][action] = {
          amount: 0,
          unit: '',
          effectiveCommitmentIds: [],
        };
      }
    }

    return liabilities;
  }

  /**
   * Check if liabilities have converged
   */
  private hasConverged(
    current: LiabilityMap,
    previous: LiabilityMap | null
  ): boolean {
    if (!previous) {
      return false;
    }

    for (const userId in current) {
      for (const action in current[userId]) {
        const currentAmount = current[userId][action].amount;
        const previousAmount = previous[userId]?.[action]?.amount || 0;

        if (Math.abs(currentAmount - previousAmount) > LiabilityCalculator.CONVERGENCE_THRESHOLD) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Deep copy liabilities map
   */
  private deepCopyLiabilities(liabilities: LiabilityMap): LiabilityMap {
    const copy: LiabilityMap = {};

    for (const userId in liabilities) {
      copy[userId] = {};
      for (const action in liabilities[userId]) {
        copy[userId][action] = {
          amount: liabilities[userId][action].amount,
          unit: liabilities[userId][action].unit,
          effectiveCommitmentIds: [...liabilities[userId][action].effectiveCommitmentIds],
        };
      }
    }

    return copy;
  }

  /**
   * Convert liability map to array
   */
  private liabilityMapToArray(liabilities: LiabilityMap): CalculatedLiability[] {
    const result: CalculatedLiability[] = [];

    for (const userId in liabilities) {
      for (const action in liabilities[userId]) {
        const liability = liabilities[userId][action];
        if (liability.amount > 0) {
          result.push({
            userId,
            action,
            amount: liability.amount,
            unit: liability.unit,
            effectiveCommitmentIds: liability.effectiveCommitmentIds,
          });
        }
      }
    }

    return result;
  }
}

export const liabilityCalculator = new LiabilityCalculator();
