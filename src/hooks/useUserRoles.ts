'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  getUserRoles,
  createUserRole,
  updateUserRole,
  deleteUserRole,
  getCurrentUserRoles,
  UserRole,
  UserRoleFilter
} from '@/app/actions/user';

export function useUserRoles(initialFilter?: UserRoleFilter) {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<UserRoleFilter | undefined>(initialFilter);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserRoles(filter);
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user roles'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const create = async (data: Partial<UserRole>) => {
    try {
      const newRole = await createUserRole(data);
      setRoles(prev => [newRole, ...prev]);
      return newRole;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create user role');
    }
  };

  const update = async (id: string, data: Partial<UserRole>) => {
    try {
      const updatedRole = await updateUserRole(id, data);
      setRoles(prev => 
        prev.map(role => role.id === id ? updatedRole : role)
      );
      return updatedRole;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update user role');
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteUserRole(id);
      setRoles(prev => prev.filter(role => role.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete user role');
    }
  };

  const updateFilter = (newFilter: UserRoleFilter) => {
    setFilter(newFilter);
  };

  // Hook to get current user's roles
  const useCurrentUserRoles = () => {
    const [currentRoles, setCurrentRoles] = useState<UserRole[]>([]);
    const [currentLoading, setCurrentLoading] = useState(true);
    const [currentError, setCurrentError] = useState<Error | null>(null);

    const fetchCurrentRoles = useCallback(async () => {
      try {
        setCurrentLoading(true);
        setCurrentError(null);
        const data = await getCurrentUserRoles();
        setCurrentRoles(data);
      } catch (err) {
        setCurrentError(err instanceof Error ? err : new Error('Failed to fetch current user roles'));
      } finally {
        setCurrentLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchCurrentRoles();
    }, [fetchCurrentRoles]);

    return {
      currentRoles,
      currentLoading,
      currentError,
      refreshCurrentRoles: fetchCurrentRoles
    };
  };

  return {
    roles,
    loading,
    error,
    filter,
    updateFilter,
    create,
    update,
    remove,
    refresh: fetchRoles,
    useCurrentUserRoles
  };
}
