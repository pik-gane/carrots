import { z } from 'zod';

// Schema for creating a new group
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
});

// Schema for updating a group
export const updateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be at most 100 characters').optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
