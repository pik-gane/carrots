import { z } from 'zod';

/**
 * Schema for updating user profile
 */
export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .optional(),
}).refine((data) => data.username || data.email, {
  message: 'At least one field (username or email) must be provided',
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
