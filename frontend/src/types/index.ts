// Frontend TypeScript types for the Carrots application

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  memberships?: Array<{
    id: string;
    userId: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      username: string;
      email: string;
    };
  }>;
}

export interface GroupMember {
  userId: string;
  username: string;
  email: string;
  role: 'creator' | 'member';
  joinedAt: string;
}

// Individual condition in a conjunction
export interface CommitmentCondition {
  targetUserId?: string; // The user Ai who must perform the action (undefined for aggregate)
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

export interface ParsedCommitment {
  conditions: CommitmentCondition[]; // Conjunction of conditions
  promises: CommitmentPromise[]; // Multiple promises (base + proportional)
}

export interface Commitment {
  id: string;
  groupId: string;
  creatorId: string;
  status: 'active' | 'revoked';
  conditionType: 'single_user' | 'aggregate' | 'unconditional';
  naturalLanguageText: string | null;
  parsedCommitment: ParsedCommitment;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  creator: {
    id: string;
    username: string;
    email: string;
  };
  group: {
    id: string;
    name: string;
  };
  warnings?: string[];
}

export interface Liability {
  id: string;
  groupId: string;
  userId: string;
  username: string;
  action: string;
  amount: number;
  unit: string;
  calculatedAt: string;
  effectiveCommitmentIds: string[];
}

export interface NLPParseResponse {
  success: boolean;
  parsed?: ParsedCommitment;
  clarificationNeeded?: string;
  debug?: {
    prompt: string;
    response: string;
    provider: string;
  };
}

export interface ApiError {
  error: string;
  statusCode: number;
}
