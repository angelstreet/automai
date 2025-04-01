'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

import { getUserPermissions } from '@/app/actions/permissionAction';
import type {  ResourceType, Operation, PermissionMatrix, PermissionsResult  } from '@/types/context/permissionsContextType';
import { useTeam, useUser } from '@/context';

// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

interface PermissionCache {
  timestamp: number;
  data: PermissionsResult;
}

// Create a cache object to store permissions by team-user pair
const permissionsCache = new Map<string, PermissionCache>();

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

  // Generate a cache key from user and team IDs
  const getCacheKey = useCallback((userId: string, teamId: string) => `${userId}:${teamId}`, []);

  const loadPermissions = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id || !activeTeam?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const cacheKey = getCacheKey(user.id, activeTeam.id);
        const cachedPermissions = permissionsCache.get(cacheKey);
        const now = Date.now();

        // Check if we have valid cached permissions and a refresh isn't forced
        if (
          !forceRefresh &&
          cachedPermissions &&
          now - cachedPermissions.timestamp < CACHE_DURATION
        ) {
          console.log(
            `[@context:permission:loadPermissions] Using cached permissions for user: ${user.id}, team: ${activeTeam.id}`,
          );
          setPermissions(cachedPermissions.data);
          setLoading(false);
          return;
        }

        console.log(
          `[@context:permission:loadPermissions] ${forceRefresh ? 'Force refreshing' : 'Loading'} permissions for user: ${user.id}, team: ${activeTeam.id}`,
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

          // Update the cache with the new permissions
          permissionsCache.set(cacheKey, {
            timestamp: now,
            data: result,
          });

          setPermissions(result);
        }
      } catch (err) {
        console.error(`[@context:permission:loadPermissions] Error loading permissions:`, err);
        setError('An unexpected error occurred while loading permissions');
      } finally {
        setLoading(false);
      }
    },
    [user?.id, activeTeam?.id, getCacheKey],
  );

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
    await loadPermissions(true); // Force refresh
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
