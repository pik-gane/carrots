import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface SimpleCondition {
  type: 'single_user' | 'aggregate';
  targetUserId?: string;
  action: string;
  minAmount: number;
  unit: string;
}

interface SimplePromise {
  action: string;
  minAmount: number;
  unit: string;
}

interface SimpleParsedCommitment {
  condition: SimpleCondition;
  promise: SimplePromise;
}

interface SimpleCommitment {
  id: string;
  creatorId: string;
  parsedCommitment: SimpleParsedCommitment;
}

interface LiabilityMap {
  [userId: string]: {
    [action: string]: {
      amount: number;
      unit: string;
      effectiveCommitmentIds: string[];
    };
  };
}

interface CalculatedLiability {
  userId: string;
  username?: string;
  action: string;
  amount: number;
  unit: string;
  effectiveCommitmentIds: string[];
}

/**
 * SimpleLiabilityCalculator - Calculate liabilities using single condition/promise model
 * 
 * Implements fixed-point algorithm:
 * L_i(a) = max { promise.minAmount | commitment.creatorId === i, condition is satisfied }
 */
export class SimpleLiabilityCalculator {
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

    // Get all group members with usernames
    const members = await this.getGroupMembers(groupId);
    const userIds = members.map((m) => m.userId);
    const userMap = new Map(members.map((m) => [m.userId, m.user.username]));

    // Extract all unique action-unit pairs
    const actionUnits = this.extractUniqueActionUnits(commitments);

    // Initialize liabilities to zero
    const liabilities = this.initializeLiabilities(userIds, actionUnits);

    // Fixed-point iteration
    let previousLiabilities: LiabilityMap | null = null;
    let iterations = 0;

    while (
      !this.hasConverged(liabilities, previousLiabilities) &&
      iterations < SimpleLiabilityCalculator.MAX_ITERATIONS
    ) {
      previousLiabilities = this.deepCopyLiabilities(liabilities);

      for (const commitment of commitments) {
        const conditionMet = this.evaluateCondition(
          commitment.parsedCommitment.condition,
          liabilities,
          commitment.creatorId
        );

        if (conditionMet) {
          const userId = commitment.creatorId;
          const action = commitment.parsedCommitment.promise.action;
          const amount = commitment.parsedCommitment.promise.minAmount;
          const unit = commitment.parsedCommitment.promise.unit;
          // Use composite key "action:unit" to differentiate actions by unit
          const actionUnitKey = `${action}:${unit}`;

          // Initialize user-action if not exists
          if (!liabilities[userId]) {
            liabilities[userId] = {};
          }
          if (!liabilities[userId][actionUnitKey]) {
            liabilities[userId][actionUnitKey] = {
              amount: 0,
              unit,
              effectiveCommitmentIds: [],
            };
          }

          // Update to max committed value
          if (amount > liabilities[userId][actionUnitKey].amount) {
            liabilities[userId][actionUnitKey].amount = amount;
            liabilities[userId][actionUnitKey].unit = unit;
            liabilities[userId][actionUnitKey].effectiveCommitmentIds = [commitment.id];
          } else if (amount === liabilities[userId][actionUnitKey].amount && amount > 0) {
            if (!liabilities[userId][actionUnitKey].effectiveCommitmentIds.includes(commitment.id)) {
              liabilities[userId][actionUnitKey].effectiveCommitmentIds.push(commitment.id);
            }
          }
        }
      }

      iterations++;
    }

    if (iterations >= SimpleLiabilityCalculator.MAX_ITERATIONS) {
      logger.warn(`Liability calculation did not converge after ${iterations} iterations`);
      throw new Error('Liability calculation did not converge');
    }

    logger.info(`Liability calculation converged after ${iterations} iterations`);

    // Convert to array format with usernames
    return this.liabilityMapToArray(liabilities, userMap);
  }

  /**
   * Evaluate if a commitment's condition is satisfied
   */
  private evaluateCondition(
    condition: SimpleCondition,
    currentLiabilities: LiabilityMap,
    creatorId: string
  ): boolean {
    if (condition.type === 'single_user') {
      const userId = condition.targetUserId!;
      const actionUnitKey = `${condition.action}:${condition.unit}`;
      const userLiability = currentLiabilities[userId]?.[actionUnitKey]?.amount || 0;
      return userLiability >= condition.minAmount;
    } else if (condition.type === 'aggregate') {
      const actionUnitKey = `${condition.action}:${condition.unit}`;
      // Sum all users' liabilities for this action:unit combination, excluding the creator
      let totalLiability = 0;
      for (const userId of Object.keys(currentLiabilities)) {
        if (userId !== creatorId) {
          totalLiability += currentLiabilities[userId]?.[actionUnitKey]?.amount || 0;
        }
      }
      return totalLiability >= condition.minAmount;
    }
    return false;
  }

  /**
   * Get active commitments for a group
   */
  private async getActiveCommitments(groupId: string): Promise<SimpleCommitment[]> {
    const commitments = await prisma.commitment.findMany({
      where: {
        groupId,
        status: 'active',
      },
    });

    return commitments.map((c) => ({
      id: c.id,
      creatorId: c.creatorId,
      parsedCommitment: c.parsedCommitment as unknown as SimpleParsedCommitment,
    }));
  }

  /**
   * Get group members with usernames
   */
  private async getGroupMembers(groupId: string) {
    return prisma.groupMembership.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });
  }

  /**
   * Extract all unique action-unit pairs from commitments
   * Returns a Map where key is "action:unit" composite string
   */
  private extractUniqueActionUnits(commitments: SimpleCommitment[]): Map<string, string> {
    const actionUnits = new Map<string, string>();

    for (const commitment of commitments) {
      const { condition, promise } = commitment.parsedCommitment;
      // Use composite key "action:unit" to treat different units as different actions
      const conditionKey = `${condition.action}:${condition.unit}`;
      const promiseKey = `${promise.action}:${promise.unit}`;
      actionUnits.set(conditionKey, condition.unit);
      actionUnits.set(promiseKey, promise.unit);
    }

    return actionUnits;
  }

  /**
   * Initialize liabilities to zero for all users and action:unit combinations
   */
  private initializeLiabilities(userIds: string[], actionUnits: Map<string, string>): LiabilityMap {
    const liabilities: LiabilityMap = {};

    for (const userId of userIds) {
      liabilities[userId] = {};
      for (const [actionUnitKey, unit] of actionUnits.entries()) {
        // actionUnitKey is "action:unit"
        liabilities[userId][actionUnitKey] = {
          amount: 0,
          unit,
          effectiveCommitmentIds: [],
        };
      }
    }

    return liabilities;
  }

  /**
   * Check if liabilities have converged
   */
  private hasConverged(current: LiabilityMap, previous: LiabilityMap | null): boolean {
    if (!previous) {
      return false;
    }

    for (const userId of Object.keys(current)) {
      for (const action of Object.keys(current[userId])) {
        const currentAmount = current[userId][action]?.amount || 0;
        const previousAmount = previous[userId]?.[action]?.amount || 0;
        if (Math.abs(currentAmount - previousAmount) > SimpleLiabilityCalculator.CONVERGENCE_THRESHOLD) {
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
    for (const userId of Object.keys(liabilities)) {
      copy[userId] = {};
      for (const action of Object.keys(liabilities[userId])) {
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
   * Convert liability map to array format
   */
  private liabilityMapToArray(
    liabilities: LiabilityMap,
    userMap: Map<string, string>
  ): CalculatedLiability[] {
    const result: CalculatedLiability[] = [];

    for (const userId of Object.keys(liabilities)) {
      for (const actionUnitKey of Object.keys(liabilities[userId])) {
        const liability = liabilities[userId][actionUnitKey];
        if (liability.amount > 0) {
          // Extract action from composite key "action:unit"
          const [action] = actionUnitKey.split(':');
          result.push({
            userId,
            username: userMap.get(userId),
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
