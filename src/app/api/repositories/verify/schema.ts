import { z } from 'zod';

// Schema for repository verification requests
export const repositoryVerifySchema = z.object({
  url: z.string().url('Repository URL must be a valid URL'),
});

export type RepositoryVerifyRequest = z.infer<typeof repositoryVerifySchema>;