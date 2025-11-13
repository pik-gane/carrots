import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { ParsedCommitment, CommitmentCondition, CommitmentPromise } from '../types';

const prisma = new PrismaClient();

interface SimpleCommitment {
  id: string;
  creatorId: string;
  parsedCommitment: ParsedCommitment;
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
 * SimpleLiabilityCalculator - Calculate liabilities using arrays of conditions/promises model
 * 
 * Implements fixed-point algorithm with support for:
 * - Multiple conditions (conjunction)
 * - Multiple promises (base + proportional)
 * - Aggregate vs single-user conditions
 * - Aggregate vs single-user proportional matching
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

    // Initialize liabilities to maximum promised amounts (game-theoretic approach)
    const liabilities = this.initializeLiabilities(userIds, actionUnits, commitments);

    // Fixed-point iteration
    let previousLiabilities: LiabilityMap | null = null;
    let iterations = 0;

    while (
      !this.hasConverged(liabilities, previousLiabilities) &&
      iterations < SimpleLiabilityCalculator.MAX_ITERATIONS
    ) {
      previousLiabilities = this.deepCopyLiabilities(liabilities);

      // Reset all liabilities to zero, then recalculate based on currently satisfied conditions
      for (const userId of userIds) {
        for (const actionUnitKey of Object.keys(liabilities[userId])) {
          liabilities[userId][actionUnitKey].amount = 0;
          liabilities[userId][actionUnitKey].effectiveCommitmentIds = [];
        }
      }

      // Recalculate liabilities based on currently satisfied conditions
      for (const commitment of commitments) {
        const conditionsMet = this.evaluateConditions(
          commitment.parsedCommitment.conditions,
          previousLiabilities,
          commitment.creatorId
        );

        if (conditionsMet) {
          const userId = commitment.creatorId;
          
          // Process all promises
          for (const promise of commitment.parsedCommitment.promises) {
            const action = promise.action;
            const unit = promise.unit;
            const actionUnitKey = `${action}:${unit}`;
            
            // Calculate promised amount (base + proportional)
            const amount = this.calculatePromisedAmount(promise, previousLiabilities);

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

            // Update to max committed value among satisfied conditions
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
   * Evaluate if all commitment conditions are satisfied (conjunction)
   */
  private evaluateConditions(
    conditions: CommitmentCondition[],
    currentLiabilities: LiabilityMap,
    creatorId: string
  ): boolean {
    // All conditions must be satisfied (conjunction)
    for (const condition of conditions) {
      if (!this.evaluateSingleCondition(condition, currentLiabilities, creatorId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate if a single condition is satisfied
   */
  private evaluateSingleCondition(
    condition: CommitmentCondition,
    currentLiabilities: LiabilityMap,
    creatorId: string
  ): boolean {
    const actionUnitKey = `${condition.action}:${condition.unit}`;
    
    if (condition.targetUserId) {
      // Single-user condition: check specific user's liability
      const userLiability = currentLiabilities[condition.targetUserId]?.[actionUnitKey]?.amount || 0;
      return userLiability >= condition.minAmount;
    } else {
      // Aggregate condition: sum all users' liabilities, excluding the creator
      let totalLiability = 0;
      for (const userId of Object.keys(currentLiabilities)) {
        if (userId !== creatorId) {
          totalLiability += currentLiabilities[userId]?.[actionUnitKey]?.amount || 0;
        }
      }
      return totalLiability >= condition.minAmount;
    }
  }

  /**
   * Calculate the total promised amount for a promise
   * Handles base amounts and proportional (affine linear) contributions with caps
   */
  private calculatePromisedAmount(
    promise: CommitmentPromise,
    currentLiabilities: LiabilityMap
  ): number {
    let totalAmount = 0;

    // Add base amount
    totalAmount += promise.baseAmount;

    // Add proportional amount based on reference user/aggregate excess
    if (promise.proportionalAmount > 0 && promise.referenceAction) {
      let referenceAmount = 0;
      const refActionUnitKey = `${promise.referenceAction}:${promise.unit}`;
      
      if (promise.referenceUserId) {
        // Single-user proportional matching
        referenceAmount = currentLiabilities[promise.referenceUserId]?.[refActionUnitKey]?.amount || 0;
      } else {
        // Aggregate proportional matching: sum all users' actions
        for (const userId of Object.keys(currentLiabilities)) {
          referenceAmount += currentLiabilities[userId]?.[refActionUnitKey]?.amount || 0;
        }
      }
      
      const threshold = promise.thresholdAmount || 0;
      const excess = Math.max(0, referenceAmount - threshold);
      const proportionalContribution = promise.proportionalAmount * excess;
      
      // Apply maximum cap if specified
      const cappedContribution = promise.maxAmount !== undefined
        ? Math.min(promise.maxAmount, proportionalContribution)
        : proportionalContribution;
      
      totalAmount += cappedContribution;
    }

    return totalAmount;
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
      parsedCommitment: c.parsedCommitment as unknown as ParsedCommitment,
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
      const parsed = commitment.parsedCommitment;
      
      // Process all conditions
      for (const condition of parsed.conditions) {
        const conditionKey = `${condition.action}:${condition.unit}`;
        actionUnits.set(conditionKey, condition.unit);
      }
      
      // Process all promises
      for (const promise of parsed.promises) {
        const promiseKey = `${promise.action}:${promise.unit}`;
        actionUnits.set(promiseKey, promise.unit);
        
        // Also include reference actions
        if (promise.referenceAction) {
          const refKey = `${promise.referenceAction}:${promise.unit}`;
          actionUnits.set(refKey, promise.unit);
        }
      }
    }

    return actionUnits;
  }

  /**
   * Initialize liabilities to maximum promised amounts for each user and action:unit combination
   * This implements the game-theoretic approach where we start with max promises
   * and iteratively reduce to what's actually required based on satisfied conditions
   */
  private initializeLiabilities(userIds: string[], actionUnits: Map<string, string>, commitments: SimpleCommitment[]): LiabilityMap {
    const liabilities: LiabilityMap = {};

    // Initialize all to zero first
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

    // Set to maximum promised amounts (for initial guess)
    for (const commitment of commitments) {
      const userId = commitment.creatorId;
      
      // Process all promises
      for (const promise of commitment.parsedCommitment.promises) {
        const actionUnitKey = `${promise.action}:${promise.unit}`;
        
        if (!liabilities[userId]) {
          liabilities[userId] = {};
        }
        if (!liabilities[userId][actionUnitKey]) {
          liabilities[userId][actionUnitKey] = {
            amount: 0,
            unit: promise.unit,
            effectiveCommitmentIds: [],
          };
        }
        
        // Use max of base and capped proportional as initial guess
        const initialGuess = promise.baseAmount + (promise.maxAmount || 0);
        
        // Set to max of all promises for this user-action-unit combination
        if (initialGuess > liabilities[userId][actionUnitKey].amount) {
          liabilities[userId][actionUnitKey].amount = initialGuess;
          liabilities[userId][actionUnitKey].effectiveCommitmentIds = [commitment.id];
        } else if (initialGuess === liabilities[userId][actionUnitKey].amount && initialGuess > 0) {
          if (!liabilities[userId][actionUnitKey].effectiveCommitmentIds.includes(commitment.id)) {
            liabilities[userId][actionUnitKey].effectiveCommitmentIds.push(commitment.id);
          }
        }
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
