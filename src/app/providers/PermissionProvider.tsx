'use client';

import React from 'react';

import { PermissionContext } from '@/context/PermissionContext';
import { PermissionsResult } from '@/types/context/permissionsContextType';

/**
 * PermissionProvider manages the permissions state for the application
 * This component only handles permissions state, no business logic included
 * To access permissions functionality, use the usePermission hook from @/hooks/permission
 */
export function PermissionProvider({
  children,
  initialPermissions = null,
}: {
  children: React.ReactNode;
  initialPermissions?: PermissionsResult | null;
}) {
  const [permissions, _setPermissions] = React.useState<PermissionsResult | null>(
    initialPermissions,
  );

  // Provide state container only, business logic in hooks/permission
  const value = {
    permissions,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

// No hooks exported from this provider - use @/hooks/permission/usePermission instead
