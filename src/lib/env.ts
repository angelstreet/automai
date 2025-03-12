import { z } from 'zod';

// Define environment schema
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    JWT_SECRET: z.string().min(1),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return !!data.NEXT_PUBLIC_SUPABASE_URL && !!data.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      }
      return true;
    },
    {
      message: 'Supabase credentials are required in production environment',
      path: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    }
  );

// Process environment variables
const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
};

const isBrowser = typeof window !== 'undefined';

// Client-side schema
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default('http://localhost:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  IDX: z.string().optional(),
});

export const env = isBrowser
  ? clientEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV,
    })
  : envSchema.parse(processEnv);

export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';
