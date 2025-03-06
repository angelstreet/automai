import { z } from 'zod';

// Define environment schema
const envSchema = z
  .object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),

    // Database - optional when using Supabase
    DATABASE_URL: z.string().url().optional(),

    // Supabase - only required in production
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // Authentication
    JWT_SECRET: z.string().min(1),

    // Elasticsearch
    ELASTICSEARCH_URL: z.string().url().optional(),
  })
  .refine(
    // Supabase credentials are required in production environment
    (data) => {
      if (data.NODE_ENV === 'production') {
        return !!data.NEXT_PUBLIC_SUPABASE_URL && !!data.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      }
      return true;
    },
    {
      message: 'Supabase credentials are required in production environment',
      path: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    },
  );

// Process environment variables
const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
};

// Detect if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// For client-side, only validate public env vars
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default('http://localhost:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .optional()
    .default(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    ),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate and export environment configuration based on environment
export const env = isBrowser
  ? clientEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NODE_ENV: process.env.NODE_ENV,
    })
  : envSchema.parse(processEnv);

// Safe helper functions that work in both browser and server
export const isCodespace = () => {
  if (isBrowser) return false;
  return Boolean(process.env.CODESPACE);
};
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isTest = () => process.env.NODE_ENV === 'test';

// Helper to check if we're using Supabase
export const isUsingSupabase = () => {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
};

export const getBaseUrl = () => {
  if (isBrowser) {
    return window.location.origin;
  }

  if (process.env.CODESPACE) {
    return `https://${process.env.CODESPACE_NAME}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
  }

  // Use NEXT_PUBLIC_SITE_URL for Supabase
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};
