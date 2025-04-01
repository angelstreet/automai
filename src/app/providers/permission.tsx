'use client';

import React, { createContext, useContext, useState } from 'react';

import type { PermissionsResult } from '@/types/context/permissions';

// Define a minimal permission context that only holds data
interface PermissionContextType {
  permissionsData: PermissionsResult | null;
  permissionsLoading: boolean;
  permissionsError: string | null;
}

// Create context with default values
const PermissionContext = createContext<PermissionContextType>({
  permissionsData: null,
  permissionsLoading: false,
  permissionsError: null,
});

export function PermissionProvider({
  children,
  initialPermissions = null,
}: {
  children: React.ReactNode;
  initialPermissions?: PermissionsResult | null;
}) {
  // Simple state for permissions data
  const [permissionsData, setPermissionsData] = useState<PermissionsResult | null>(
    initialPermissions,
  );
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // Just provide data, no logic
  return (
    <PermissionContext.Provider
      value={{
        permissionsData,
        permissionsLoading,
        permissionsError,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

// Export a simple hook to access the permission context
export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
}
