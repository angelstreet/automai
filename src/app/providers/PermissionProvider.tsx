'use client';

import React from 'react';

import { PermissionContext } from '@/context/PermissionContext';
import { AuthUser, User } from '@/types/component/userComponentType';

/**
 * PermissionProvider manages the permissions state for the application
 * This component only handles permissions state, no business logic included
 * To access permissions functionality, use the usePermission hook from @/hooks/permission
 */
export function PermissionProvider({
  children,
  initialUser,
  initialPermissions,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | User | null;
  initialPermissions?: Record<string, boolean>;
}) {
  const [user, setUser] = React.useState(initialUser || null);
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>(
    initialPermissions || {},
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Provide state container only, business logic in hooks/permission
  const value = {
    user,
    setUser,
    permissions,
    setPermissions,
    isLoading,
    setIsLoading,
    error,
    setError,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

// No hooks exported from this provider - use @/hooks/permission/usePermission instead
