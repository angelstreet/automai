/**
 * Core User type definitions
 * Contains all user and authentication related data models
 */

/**
 * User role enum
 */
export type Role = 'admin' | 'manager' | 'member' | 'guest';

/**
 * UI-specific role enum
 */
export type UIRole = 'admin' | 'manager' | 'member' | 'guest' | 'none';

/**
 * OAuth provider types
 */
export type OAuthProvider = 'github' | 'google' | 'azure' | 'gitlab';

/**
 * User entity
 */
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

/**
 * Extended user for authentication
 */
export interface AuthUser extends User {
  emailVerified: Date | null;
}

/**
 * User session data
 */
export interface UserSession {
  expires: string;
  user: AuthUser;
}

/**
 * Team data for user
 */
export interface UserTeam {
  id: string;
  name: string;
  role: Role;
}

/**
 * Team member entry
 */
export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: Role;
  user: User;
  created_at: string;
  updated_at: string;
}

/**
 * Resource limits
 */
export interface ResourceLimit {
  maxProjects: number;
  maxUsers: number;
  maxStorage: number;
  maxHostsPerProject?: number;
  maxReposPerProject?: number;
}

/**
 * Tenant info
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

/**
 * Auth session data
 */
export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  provider?: string;
}

/**
 * Session data
 */
export interface SessionData {
  user: User;
  token: string;
  expires: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  session?: AuthSession;
  error?: string;
}
