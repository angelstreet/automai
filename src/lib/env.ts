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
    // IDX-specific environment variables
    IDX: z.string().optional(), // IDX environment flag
    IDX_WORKSPACE_ID: z.string().optional(), // IDX workspace identifier
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
  IDX: process.env.IDX,
  IDX_WORKSPACE_ID: process.env.IDX_WORKSPACE_ID,
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
      IDX: process.env.IDX,
    })
  : envSchema.parse(processEnv);

// Environment detection functions
export const isIdx = () => {
  if (isBrowser) {
    return (
      typeof window !== 'undefined' && 
      (window.location.hostname.includes('.cloudworkstations.dev') ||
       window.location.hostname.includes('idx.google.com'))
    );
  }
  return Boolean(process.env.IDX) || Boolean(process.env.IDX_WORKSPACE_ID);
};

export const isCodespace = () => {
  if (isBrowser) {
    return typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev');
  }
  return Boolean(process.env.CODESPACE);
};

export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';

export const isUsingSupabase = () => {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

export const getSiteUrl = () => {
  if (isBrowser) {
    return window.location.origin;
  }

  if (isIdx()) {
    const workspaceId = process.env.IDX_WORKSPACE_ID || 'default-workspace';
    const port = env.PORT || '3000';
    // IDX typically uses a pattern like: https://[port]-[workspace-id].cloudworkstations.dev
    return `https://${port}-${workspaceId}.cloudworkstations.dev`;
  }

  if (isCodespace()) {
    return `https://${process.env.CODESPACE_NAME}-${env.PORT || '3000'}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`;
  }

  if (isProduction()) {
    return 'https://automai-eta.vercel.app';
  }

  return `http://localhost:${env.PORT || '3000'}`;
};

// IDX-specific helper
export const getIdxWorkspaceInfo = () => {
  if (!isIdx()) return null;
  return {
    workspaceId: process.env.IDX_WORKSPACE_ID,
    port: env.PORT,
    previewUrl: getSiteUrl(),
  };
};