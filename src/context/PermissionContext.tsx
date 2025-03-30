'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useTeam } from '@/context/TeamContext';
import { useUser } from '@/context/UserContext';
import {
  getUserPermissions,
  checkPermission,
  ResourceType,
  Operation,
  PermissionMatrix,
  PermissionsResult,
} from '@/app/actions/permission';

interface PermissionContextType {
  permissions: PermissionsResult | null;
  loading: boolean;
  error: string | null;
  hasPermission: (resourceType: ResourceType, operation: Operation, creatorId?: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: null,
  loading: true,
  error: null,
  hasPermission: () => false,
  refreshPermissions: async () => {},
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const [permissions, setPermissions] = useState<PermissionsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    if (!user?.id || !activeTeam?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(
        `[@context:permission:loadPermissions] Loading permissions for user: ${user.id}, team: ${activeTeam.id}`,
      );
      const result = await getUserPermissions(user.id, activeTeam.id);

      if (!result.success) {
        console.error(
          `[@context:permission:loadPermissions] Failed to load permissions:`,
          result.error,
        );
        setError(result.error?.toString() || 'Failed to load permissions');
      } else {
        console.log(`[@context:permission:loadPermissions] Successfully loaded permissions`);
        setPermissions(result);
      }
    } catch (err) {
      console.error(`[@context:permission:loadPermissions] Error loading permissions:`, err);
      setError('An unexpected error occurred while loading permissions');
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeTeam?.id]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback(
    (resourceType: ResourceType, operation: Operation, creatorId?: string): boolean => {
      if (loading || !permissions || !permissions.success || !permissions.data) {
        return false;
      }

      // Check if the permission exists in the matrix
      const permissionEntry = permissions.data.find((p) => p.resource_type === resourceType);
      if (!permissionEntry) {
        return false;
      }

      // If user is the creator, check own permissions
      if (creatorId && creatorId === user?.id) {
        switch (operation) {
          case 'update':
            return !!permissionEntry.can_update_own;
          case 'delete':
            return !!permissionEntry.can_delete_own;
          default:
            break;
        }
      }

      // Check general permissions
      switch (operation) {
        case 'select':
          return !!permissionEntry.can_select;
        case 'insert':
          return !!permissionEntry.can_insert;
        case 'update':
          return !!permissionEntry.can_update;
        case 'delete':
          return !!permissionEntry.can_delete;
        case 'execute':
          return !!permissionEntry.can_execute;
        default:
          return false;
      }
    },
    [loading, permissions, user?.id],
  );

  const refreshPermissions = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        error,
        hasPermission,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}

// Export types for components
export type { ResourceType, Operation, PermissionMatrix, PermissionsResult };
