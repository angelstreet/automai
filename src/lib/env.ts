import { z } from 'zod';

// Schema for environment variables
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  // Database
  DATABASE_URL: z.string(),

  // Auth
  JWT_SECRET: z.string(),

  // NextAuth
  NEXTAUTH_URL: z.string().default('http://localhost:3000'),
});

// Parse environment variables
const env = envSchema.parse(process.env);

export default env;
