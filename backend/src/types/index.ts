// Core domain types for the Carrots application

export interface ParsedCommitment {
  condition: CommitmentCondition;
  promise: CommitmentPromise;
}

export interface CommitmentCondition {
  type: 'single_user' | 'aggregate';
  targetUserId?: string; // Required for single_user, null for aggregate
  action: string;
  minAmount: number;
  unit: string;
}

export interface CommitmentPromise {
  action: string;
  minAmount: number;
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
