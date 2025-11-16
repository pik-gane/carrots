import { z } from 'zod';

// Schema for individual condition in a conjunction
// targetUserId is optional - if omitted/null, this is an aggregate condition on all users
export const commitmentConditionSchema = z.object({
  targetUserId: z.string().uuid('Target user ID must be a valid UUID').optional(),
  action: z.string().min(1, 'Action is required').max(100, 'Action must be at most 100 characters'),
  minAmount: z.number().nonnegative('Minimum amount must be non-negative'),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit must be at most 50 characters'),
});

// Schema for individual promise (can be base or proportional with cap)
// referenceUserId is optional - if omitted/null, proportional matching is on aggregate of all users
export const commitmentPromiseSchema = z.object({
  action: z.string().min(1, 'Action is required').max(100, 'Action must be at most 100 characters'),
  baseAmount: z.number().nonnegative('Base amount must be non-negative'),
  proportionalAmount: z.number().nonnegative('Proportional amount must be non-negative'),
  referenceUserId: z.string().uuid('Reference user ID must be a valid UUID').optional().nullable(),
  referenceAction: z.string().min(1).max(100).optional(),
  thresholdAmount: z.number().nonnegative('Threshold amount must be non-negative').optional(),
  maxAmount: z.number().positive('Max amount must be positive').optional(),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit must be at most 50 characters'),
}).refine(
  (data) => {
    // If proportionalAmount > 0, then referenceAction must be provided
    if (data.proportionalAmount > 0 && !data.referenceAction) {
      return false;
    }
    // At least one of baseAmount or proportionalAmount must be > 0
    if (data.baseAmount === 0 && data.proportionalAmount === 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Promise must have either baseAmount > 0 or (proportionalAmount > 0 and referenceAction)',
  }
);

// Schema for parsed commitment
// Conditions can be empty for unconditional commitments
export const parsedCommitmentSchema = z.object({
  conditions: z.array(commitmentConditionSchema),
  promises: z.array(commitmentPromiseSchema).min(1, 'At least one promise is required'),
});

// Schema for creating a new commitment (structured input)
export const createCommitmentSchema = z.object({
  groupId: z.string().uuid('Group ID must be a valid UUID'),
  parsedCommitment: parsedCommitmentSchema,
  naturalLanguageText: z.string().max(500, 'Natural language text must be at most 500 characters').optional(),
});

// Schema for updating a commitment
export const updateCommitmentSchema = z.object({
  parsedCommitment: parsedCommitmentSchema.optional(),
  naturalLanguageText: z.string().max(500, 'Natural language text must be at most 500 characters').optional(),
});

// Schema for commitment query parameters
export const commitmentQuerySchema = z.object({
  groupId: z.string().uuid('Group ID must be a valid UUID').optional(),
  userId: z.string().uuid('User ID must be a valid UUID').optional(),
  status: z.enum(['active', 'revoked']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>;
export type UpdateCommitmentInput = z.infer<typeof updateCommitmentSchema>;
export type CommitmentQueryInput = z.infer<typeof commitmentQuerySchema>;
export type ParsedCommitment = z.infer<typeof parsedCommitmentSchema>;
export type CommitmentCondition = z.infer<typeof commitmentConditionSchema>;
export type CommitmentPromise = z.infer<typeof commitmentPromiseSchema>;
