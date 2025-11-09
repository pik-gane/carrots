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
            if (commitment.creatorId === userId) {
              // Check if all conditions are satisfied
              const conditionsMet = this.evaluateConditions(
                commitment.parsedCommitment.conditions,
                liabilities
              );

              if (conditionsMet) {
                // Calculate promised amount for this action (may include proportional)
                const promisedAmount = this.calculatePromisedAmount(
                  commitment.parsedCommitment.promises,
                  action,
                  liabilities
                );

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
   * Evaluate if a commitment's conditions are satisfied (conjunction)
   */
  private evaluateConditions(
    conditions: ParsedCommitment['conditions'],
    currentLiabilities: LiabilityMap
  ): boolean {
    // All conditions must be satisfied (conjunction)
    for (const condition of conditions) {
      const userId = condition.targetUserId;
      const action = condition.action;
      const minAmount = condition.minAmount;

      const userLiability = currentLiabilities[userId]?.[action]?.amount || 0;
      if (userLiability < minAmount) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate the total promised amount for a user-action pair given promises
   * Handles base amounts and proportional (affine linear) contributions with caps
   * Formula: c_i(Yi) = W0 + Σ_k min(Wk, Dk × max(0, L_Bk(Zk) - Ok))
   */
  private calculatePromisedAmount(
    promises: ParsedCommitment['promises'],
    action: string,
    currentLiabilities: LiabilityMap
  ): number {
    let totalAmount = 0;

    for (const promise of promises) {
      if (promise.action === action) {
        // Add base amount (W0)
        totalAmount += promise.baseAmount;

        // Add proportional amount based on reference user's excess
        // Dk × max(0, L_Bk(Zk) - Ok), capped at Wk
        if (promise.proportionalAmount > 0 && promise.referenceUserId && promise.referenceAction) {
          const referenceAmount = currentLiabilities[promise.referenceUserId]?.[promise.referenceAction]?.amount || 0;
          const threshold = promise.thresholdAmount || 0;
          const excess = Math.max(0, referenceAmount - threshold);
          const proportionalContribution = promise.proportionalAmount * excess;
          
          // Apply maximum cap if specified (Wi)
          const cappedContribution = promise.maxAmount !== undefined
            ? Math.min(promise.maxAmount, proportionalContribution)
            : proportionalContribution;
          
          totalAmount += cappedContribution;
        }
      }
    }

    return totalAmount;
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
      
      // Add actions from all conditions
      for (const condition of parsed.conditions) {
        actions.add(condition.action);
      }
      
      // Add actions from all promises
      for (const promise of parsed.promises) {
        actions.add(promise.action);
        if (promise.referenceAction) {
          actions.add(promise.referenceAction);
        }
      }
    }

    return Array.from(actions);
  }

  /**
   * Initialize liabilities to zero for all users and actions
   * Note: Currently unused but kept for potential future use (e.g., smallest fixed point algorithm)
   */
  // @ts-expect-error - Method intentionally kept for potential future use
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
   * Uses maxAmount caps from promises to provide clear starting points
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
      
      // Check promise values - use maxAmount caps when available
      for (const promise of parsed.promises) {
        const promiseAction = promise.action;
        
        // Base amount + maximum proportional contribution (capped at maxAmount)
        let maxAmount = promise.baseAmount;
        if (promise.maxAmount !== undefined) {
          // If maxAmount is specified, use it as the cap
          maxAmount += promise.maxAmount;
        } else if (promise.proportionalAmount > 0) {
          // Otherwise estimate conservatively
          maxAmount += Math.abs(promise.proportionalAmount) * 1000;
        }
        
        if (!maxValues[promiseAction] || maxAmount > maxValues[promiseAction].amount) {
          maxValues[promiseAction] = {
            amount: maxAmount,
            unit: promise.unit,
          };
        }
        
        // Also track reference actions (Zi variables)
        if (promise.referenceAction) {
          const refMax = promise.maxAmount !== undefined 
            ? promise.maxAmount 
            : (promise.thresholdAmount || 0) + 1000;
          if (!maxValues[promise.referenceAction] || refMax > maxValues[promise.referenceAction].amount) {
            maxValues[promise.referenceAction] = {
              amount: refMax,
              unit: promise.unit,
            };
          }
        }
      }
      
      // Check condition values
      for (const condition of parsed.conditions) {
        const conditionAction = condition.action;
        if (!maxValues[conditionAction] || condition.minAmount > maxValues[conditionAction].amount) {
          maxValues[conditionAction] = {
            amount: condition.minAmount,
            unit: condition.unit,
          };
        }
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
