import { config } from 'dotenv';
import path from 'path';

export function loadEnvConfig() {
  const env = process.env.NODE_ENV || 'development';
  const envPath = path.resolve(process.cwd(), 'src/server/config/env', `.env.${env}`);

  const result = config({ path: envPath });

  if (result.error) {
    console.error(`Error loading environment configuration for ${env}:`, result.error);
    throw result.error;
  }

  // Add NEXTAUTH_SECRET if not present
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = process.env.JWT_SECRET;
  }

  return result.parsed;
} 