import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { emitNewMessage } from './websocket';

const prisma = new PrismaClient();

/**
 * Recalculate liabilities for a group and notify about changes in chat
 * This function can be called from anywhere (chat, commitment routes, etc.)
 */
export async function recalculateLiabilitiesAndNotify(groupId: string): Promise<void> {
  try {
    // Get old liabilities
    const oldLiabilities = await prisma.liability.findMany({
      where: { groupId },
    });

    // Import liability calculator
    const { LiabilityCalculator } = await import('./liabilityCalculator');
    const calculator = new LiabilityCalculator();

    // Calculate new liabilities
    const calculatedLiabilities = await calculator.calculateGroupLiabilities(groupId);

    // Update liabilities in database
    const newLiabilities = [];
    for (const liability of calculatedLiabilities) {
      await prisma.liability.upsert({
        where: {
          groupId_userId_action: {
            groupId,
            userId: liability.userId,
            action: liability.action,
          },
        },
        update: {
          amount: liability.amount,
          unit: liability.unit,
          effectiveCommitmentIds: liability.effectiveCommitmentIds as any,
          calculatedAt: new Date(),
        },
        create: {
          groupId,
          userId: liability.userId,
          action: liability.action,
          amount: liability.amount,
          unit: liability.unit,
          effectiveCommitmentIds: liability.effectiveCommitmentIds as any,
        },
      });

      newLiabilities.push({
        userId: liability.userId,
        action: liability.action,
        amount: liability.amount,
        unit: liability.unit,
      });
    }

    // Detect changes and create notification
    const changes = detectLiabilityChanges(oldLiabilities, newLiabilities);

    if (changes.length > 0) {
      const changeText = formatLiabilityChanges(changes);
      const liabilityMessage = await prisma.message.create({
        data: {
          groupId,
          userId: null, // System message
          type: 'system_liability',
          content: `⚖️ Liability Update:\n\n${changeText}`,
          isPrivate: false,
          metadata: {
            changes,
          },
        },
      });
      
      // Emit liability notification to all group members
      emitNewMessage(groupId, liabilityMessage);

      logger.info('Liability changes notified to chat', { groupId, changeCount: changes.length });
    }
  } catch (error) {
    logger.error('Error recalculating liabilities and notifying', { groupId, error });
    throw error;
  }
}

/**
 * Detect changes between old and new liabilities
 */
function detectLiabilityChanges(
  oldLiabilities: any[],
  newLiabilities: any[]
): Array<{ userId: string; action: string; oldAmount: number; newAmount: number; unit: string }> {
  const changes: Array<{ userId: string; action: string; oldAmount: number; newAmount: number; unit: string }> = [];

  const oldMap = new Map<string, { amount: number; unit: string }>();
  for (const liability of oldLiabilities) {
    oldMap.set(`${liability.userId}:${liability.action}`, {
      amount: liability.amount,
      unit: liability.unit,
    });
  }

  for (const newLiability of newLiabilities) {
    const key = `${newLiability.userId}:${newLiability.action}`;
    const old = oldMap.get(key);

    if (!old) {
      // New liability
      changes.push({
        userId: newLiability.userId,
        action: newLiability.action,
        oldAmount: 0,
        newAmount: newLiability.amount,
        unit: newLiability.unit,
      });
    } else if (old.amount !== newLiability.amount) {
      // Changed liability
      changes.push({
        userId: newLiability.userId,
        action: newLiability.action,
        oldAmount: old.amount,
        newAmount: newLiability.amount,
        unit: newLiability.unit,
      });
    }
  }

  return changes;
}

/**
 * Format liability changes as natural language
 */
function formatLiabilityChanges(
  changes: Array<{ userId: string; action: string; oldAmount: number; newAmount: number; unit: string }>
): string {
  return changes
    .map((change) => {
      if (change.oldAmount === 0) {
        return `• New: ${change.action} - ${change.newAmount} ${change.unit}`;
      } else if (change.newAmount > change.oldAmount) {
        return `• ${change.action} increased from ${change.oldAmount} to ${change.newAmount} ${change.unit}`;
      } else {
        return `• ${change.action} decreased from ${change.oldAmount} to ${change.newAmount} ${change.unit}`;
      }
    })
    .join('\n');
}
