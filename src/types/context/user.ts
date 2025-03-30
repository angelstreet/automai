import { Role, User, UserTeam } from '@/types/user';

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

  // Minimal team information still comes from the user object
  teams: UserTeam[];
}
