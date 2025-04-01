/**
 * User context type definitions
 */
import { User, Role } from '@/types/component/userComponentType';

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
}

// Re-export user types for convenience
export type { User, Role };
