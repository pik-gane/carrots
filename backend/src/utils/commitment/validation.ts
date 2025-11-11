import { z } from 'zod';

// Schema for commitment condition
export const conditionSchema = z.object({
  type: z.enum(['single_user', 'aggregate', 'unconditional'], {
    errorMap: () => ({ message: 'Condition type must be "single_user", "aggregate", or "unconditional"' }),
  }),
  targetUserId: z.string().uuid('Target user ID must be a valid UUID').optional(),
  action: z.string().min(1, 'Action is required').max(100, 'Action must be at most 100 characters').optional(),
  minAmount: z.number().positive('Minimum amount must be positive').optional(),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit must be at most 50 characters').optional(),
}).refine(
  (data) => {
    // If type is unconditional, no other fields should be provided
    if (data.type === 'unconditional') {
      return !data.targetUserId && !data.action && !data.minAmount && !data.unit;
    }
    // If type is single_user or aggregate, all fields must be provided
    if (data.type === 'single_user' || data.type === 'aggregate') {
      if (!data.action || !data.minAmount || !data.unit) {
        return false;
      }
      // If type is single_user, targetUserId must be provided
      if (data.type === 'single_user' && !data.targetUserId) {
        return false;
      }
      // If type is aggregate, targetUserId should not be provided
      if (data.type === 'aggregate' && data.targetUserId) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Invalid condition: unconditional requires no fields, single_user requires targetUserId/action/minAmount/unit, aggregate requires action/minAmount/unit only',
  }
);

// Schema for commitment promise
export const promiseSchema = z.object({
  action: z.string().min(1, 'Action is required').max(100, 'Action must be at most 100 characters'),
  minAmount: z.number().positive('Minimum amount must be positive'),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit must be at most 50 characters'),
});

// Schema for parsed commitment
export const parsedCommitmentSchema = z.object({
  condition: conditionSchema,
  promise: promiseSchema,
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
export type Condition = z.infer<typeof conditionSchema>;
export type Promise = z.infer<typeof promiseSchema>;
