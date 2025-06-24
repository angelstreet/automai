/**
 * Environment Configuration
 * Configuration based on environment variables
 */

/**
 * Interface for environment configuration
 */
export interface EnvConfig {
  // Server
  NODE_ENV: 'development' | 'production' | 'test';
  BASE_URL: string;
  PORT: number;

  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Auth
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;

  // OAuth
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // App Settings
  DEFAULT_LOCALE: string;
  APP_VERSION: string;
  SUPPORT_EMAIL: string;

  // Feature Flags
  FEATURE_FLAGS_ENABLED: boolean;
}

/**
 * Check if we are in the browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get environment variables with defaults
 */
function getEnvConfig(): EnvConfig {
  // In the browser, we cannot access process.env directly
  // These values are injected at build time by Next.js
  return {
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    PORT: parseInt(process.env.PORT || '3000', 10),

    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key',

    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

    DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en',
    APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com',

    FEATURE_FLAGS_ENABLED: process.env.NEXT_PUBLIC_FEATURE_FLAGS_ENABLED === 'true',
  };
}

/**
 * The environment configuration object
 */
export const env: EnvConfig = getEnvConfig();

/**
 * Check if we are in a development environment
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * Check if we are in a production environment
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Check if we are in a test environment
 */
export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

// Export environment configuration
const envConfig = {
  env,
  isDevelopment,
  isProduction,
  isTest,
};

export default envConfig;
