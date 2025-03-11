import { z } from 'zod';

export const testConnectionSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea'] as const, {
    requirederror: 'Provider type is required',
  }),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string({
    requirederror: 'Access token is required',
  }),
});
