import { z } from 'zod';

// Define environment schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('localhost'),
  PORT: z.string().default('3000').transform(Number),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  JWT_SECRET: z.string().optional(),
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  
  // Electron
  ELECTRON_PORT: z.string().optional().transform((val) => val ? Number(val) : 3000),
});

// Validate and export environment configuration
// Use safeParse to avoid throwing errors in development
const result = envSchema.safeParse(process.env);

// If validation fails, log the errors but provide fallback values
// This is important for development experience
if (!result.success) {
  console.error('❌ Invalid environment variables:', result.error.format());
  throw new Error('Invalid environment variables');
}

export const env = result.data; 