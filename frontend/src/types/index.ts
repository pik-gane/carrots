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

export interface ParsedCommitment {
  condition: CommitmentCondition;
  promise: CommitmentPromise;
}

export interface CommitmentCondition {
  type: 'single_user' | 'aggregate';
  targetUserId?: string;
  targetUsername?: string; // For display purposes
  action: string;
  minAmount: number;
  unit: string;
}

export interface CommitmentPromise {
  action: string;
  minAmount: number;
  unit: string;
}

export interface Commitment {
  id: string;
  groupId: string;
  creatorId: string;
  status: 'active' | 'revoked';
  conditionType: 'single_user' | 'aggregate';
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
}

export interface ApiError {
  error: string;
  statusCode: number;
}
