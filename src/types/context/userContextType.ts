/**
 * User context type definitions
 */
import { User, Role, UserTeam, TeamMember, ResourceLimit } from '@/types/component/userComponentType';

/**
 * Type definition for UserContext
 */
export interface UserContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (formData: FormData) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateRole: (role: Role) => Promise<void>;
  clearCache: () => Promise<void>;
  isInitialized: boolean;
  signUp: (email: string, password: string, name: string, redirectUrl: string) => Promise<any>;
  signInWithOAuth: (provider: 'google' | 'github', redirectUrl: string) => Promise<any>;

  // Team-related functionality (consolidated from TeamContext)
  teams: UserTeam[];
  selectedTeam: UserTeam | null;
  teamMembers: TeamMember[];
  setSelectedTeam: (teamId: string) => Promise<void>;
  checkResourceLimit: (resourceType: string) => Promise<ResourceLimit | null>;
}

// Re-export user types for convenience
export type {
  User,
  Role,
  UserTeam,
  TeamMember,
  ResourceLimit
};