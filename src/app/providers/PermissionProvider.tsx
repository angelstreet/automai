'use client';

import React, { useContext } from 'react';

import { PermissionContext } from '@/context/PermissionContext';
import type { PermissionsResult } from '@/types/context/permissionsContextType';

interface PermissionProviderProps {
  children: React.ReactNode;
  permissions: PermissionsResult | null;
}

/**
 * PermissionProvider - Pure data container for permissions state
 * No business logic, no data fetching, no side effects
 */
export function PermissionProvider({ children, permissions }: PermissionProviderProps) {
  return (
    <PermissionContext.Provider value={{ permissions }}>{children}</PermissionContext.Provider>
  );
}

/**
 * Context accessor - only exports the context value
 * Business logic should be in hooks/permission/usePermission.ts
 */
export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error('usePermissionContext must be used within a PermissionProvider');
  return context;
}
