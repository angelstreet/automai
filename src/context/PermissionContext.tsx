'use client';

import { createContext } from 'react';

import type { PermissionsResult } from '@/types/context/permissionsContextType';

/**
 * Permission context type
 * This is a minimal type definition for the context
 * No business logic belongs here, that goes in hooks/permission/usePermission.ts
 */
export interface PermissionContextType {
  permissions: PermissionsResult | null;
}

/**
 * Context definition with default values
 * Used by PermissionProvider in /app/providers/PermissionProvider.tsx
 */
export const PermissionContext = createContext<PermissionContextType>({
  permissions: null,
});
