import { z } from 'zod';

export const testConnectionSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea'] as const, {
    required_error: 'Provider type is required',
  }),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string({
    required_error: 'Access token is required',
  }),
}); 