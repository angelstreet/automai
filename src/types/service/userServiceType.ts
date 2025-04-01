/**
 * Auth-specific user types
 */
import {
  Role,
  UIRole,
  User,
  AuthUser,
  UserSession,
  UserTeam,
  TeamMember,
  ResourceLimit,
  mapAuthUserToUser
} from '@/types/component/userComponentType';

// Re-export all core user types
export type {
  Role,
  UIRole,
  User,
  AuthUser,
  UserSession,
  UserTeam,
  TeamMember,
  ResourceLimit
};

// Export function normally (not a type)
export { mapAuthUserToUser };