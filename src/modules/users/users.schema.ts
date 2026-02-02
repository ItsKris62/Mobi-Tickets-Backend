import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().optional(),
    bio: z.string().optional(),
  }),
});