// Core domain types for the Carrots application

export interface ParsedCommitment {
  conditions: CommitmentCondition[]; // Conjunction of conditions
  promises: CommitmentPromise[]; // Multiple promises (base + proportional)
}

// Individual condition in a conjunction
export interface CommitmentCondition {
  targetUserId?: string; // The user Ai who must perform the action (null/undefined for aggregate)
  action: string; // The action Xi
  minAmount: number; // The minimum amount Vi
  unit: string;
}

// Individual promise (can be base or proportional with cap)
export interface CommitmentPromise {
  action: string; // The action Yi to be performed
  baseAmount: number; // W0 for first promise, 0 for proportional promises
  proportionalAmount: number; // Di for proportional promises, 0 for base
  referenceUserId?: string; // Bi - user whose excess triggers proportional amount
  referenceAction?: string; // Zi - the action to monitor (can differ from Yi)
  thresholdAmount?: number; // Oi - the threshold for "excess"
  maxAmount?: number; // Wi - maximum cap for this promise (keeps liabilities finite)
  unit: string;
}

export interface LiabilityMap {
  [userId: string]: {
    [action: string]: {
      amount: number;
      unit: string;
      effectiveCommitmentIds: string[];
    };
  };
}

export interface CalculatedLiability {
  userId: string;
  action: string;
  amount: number;
  unit: string;
  effectiveCommitmentIds: string[];
}

export interface CommitmentWithRelations {
  id: string;
  groupId: string;
  creatorId: string;
  status: string;
  conditionType: string;
  naturalLanguageText: string | null;
  parsedCommitment: ParsedCommitment;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
  creator: {
    id: string;
    username: string;
  };
}

export interface GroupWithMembers {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  memberships: Array<{
    userId: string;
    role: string;
    user: {
      id: string;
      username: string;
      email: string;
    };
  }>;
}

export interface NLPParseRequest {
  naturalLanguageText: string;
  groupId: string;
  userId: string;
}

export interface NLPParseResponse {
  success: boolean;
  parsed?: ParsedCommitment;
  clarificationNeeded?: string;
}
