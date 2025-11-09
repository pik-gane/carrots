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
 * Finds the LARGEST fixed point by starting from maximum values and iteratively reducing
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

    // Initialize liabilities to maximum values (largest fixed point approach)
    let liabilities = this.initializeLiabilitiesToMax(commitments, userIds, actions);

    // Fixed-point iteration: iteratively reduce to find largest fixed point
    let previousLiabilities: LiabilityMap | null = null;
    let iterations = 0;

    while (
      !this.hasConverged(liabilities, previousLiabilities) &&
      iterations < LiabilityCalculator.MAX_ITERATIONS
    ) {
      previousLiabilities = this.deepCopyLiabilities(liabilities);

      // For each user-action pair, compute the largest committed-to value
      for (const userId of userIds) {
        for (const action of actions) {
          let maxCommittedValue = 0;
          let effectiveCommitments: string[] = [];

          for (const commitment of commitments) {
            if (commitment.creatorId === userId && commitment.parsedCommitment.promise.action === action) {
              const conditionMet = this.evaluateCondition(
                commitment.parsedCommitment.condition,
                liabilities
              );

              if (conditionMet) {
                const promisedAmount = commitment.parsedCommitment.promise.minAmount;
                if (promisedAmount > maxCommittedValue) {
                  maxCommittedValue = promisedAmount;
                  effectiveCommitments = [commitment.id];
                } else if (promisedAmount === maxCommittedValue && maxCommittedValue > 0) {
                  effectiveCommitments.push(commitment.id);
                }
              }
            }
          }

          // Update liability to the computed maximum
          liabilities[userId][action].amount = maxCommittedValue;
          liabilities[userId][action].effectiveCommitmentIds = effectiveCommitments;
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
   * Initialize liabilities to maximum values (for largest fixed point)
   * Start from the largest value occurring in any condition or promise
   */
  private initializeLiabilitiesToMax(
    commitments: CommitmentWithRelations[],
    userIds: string[],
    actions: string[]
  ): LiabilityMap {
    const liabilities: LiabilityMap = {};

    // Find maximum value for each action across all commitments
    const maxValues: { [action: string]: { amount: number; unit: string } } = {};
    
    for (const commitment of commitments) {
      const parsed = commitment.parsedCommitment;
      
      // Check promise values
      const promiseAction = parsed.promise.action;
      if (!maxValues[promiseAction] || parsed.promise.minAmount > maxValues[promiseAction].amount) {
        maxValues[promiseAction] = {
          amount: parsed.promise.minAmount,
          unit: parsed.promise.unit,
        };
      }
      
      // Check condition values
      const conditionAction = parsed.condition.action;
      if (!maxValues[conditionAction] || parsed.condition.minAmount > maxValues[conditionAction].amount) {
        maxValues[conditionAction] = {
          amount: parsed.condition.minAmount,
          unit: parsed.condition.unit,
        };
      }
    }

    // Initialize all user-action pairs to their maximum values
    for (const userId of userIds) {
      liabilities[userId] = {};
      for (const action of actions) {
        liabilities[userId][action] = {
          amount: maxValues[action]?.amount || 0,
          unit: maxValues[action]?.unit || '',
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
