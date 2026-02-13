import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().optional(),
    bio: z.string().optional(),
  }),
});

export const addFavoriteSchema = z.object({
  body: z.object({
    eventId: z.string().uuid(),
  }),
});

export const preferencesSchema = z.object({
  body: z.object({
    notifications: z.boolean().optional(),
    language: z.string().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  }),
});