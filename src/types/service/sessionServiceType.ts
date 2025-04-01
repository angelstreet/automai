/**
 * Authentication and session type definitions
 */
import { User, UserSession } from './user';

/**
 * Authentication session data
 */
export interface AuthSession {
  user: User;
  accessToken: string;
}

/**
 * Session data structure
 */
export interface SessionData {
  user: UserSession;
  accessToken: string;
  expires: string;
}

/**
 * Result type for authentication operations
 */
export interface AuthResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * OAuth provider types
 */
export type OAuthProvider = 'google' | 'github' | 'gitlab';

/**
 * Tenant information
 */
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
