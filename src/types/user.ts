// User role types
export interface UserRole {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleFilter {
  userId?: string;
}

// Role type used in RoleContext
export type Role = 'admin' | 'tester' | 'developer' | 'viewer';

// Interface for the UI representation of a role
export interface UIRole {
  id: string;
  name: string;
  icon?: string;
}

// Response types for user role actions
export interface UserRoleResponse {
  success: boolean;
  error?: string;
  data?: UserRole[];
}

export interface SingleUserRoleResponse {
  success: boolean;
  error?: string;
  data?: UserRole;
} 