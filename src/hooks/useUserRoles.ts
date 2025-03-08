'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { 
  getUserRoles,
  createUserRole,
  updateUserRole,
  deleteUserRole,
  getCurrentUserRoles,
  UserRole,
} from '@/app/actions/user';
import { useToast } from '@/components/shadcn/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Code2, Factory } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  icon?: string;
}

export function useUserRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getUserRoles(user.id);
      
      if (response.success && response.data) {
        // Map database roles to UI roles with icons
        const rolesWithIcons = response.data.map(role => ({
          id: role.id,
          name: role.name,
          icon: getRoleIcon(role.name),
        }));

        setRoles(rolesWithIcons);
      } else {
        throw new Error(response.error || 'Failed to fetch user roles');
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user roles',
        variant: 'destructive',
      });
      // Set default roles if fetch fails
      setRoles([
        { id: 'user', name: 'User', icon: getRoleIcon('user') },
        { id: 'admin', name: 'Admin', icon: getRoleIcon('admin') },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Helper function to get role icon
  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'admin-icon';
      case 'developer':
        return 'developer-icon';
      case 'operator':
        return 'operator-icon';
      default:
        return 'user-icon';
    }
  };

  // Fetch roles on mount or when user changes
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const create = async (data: Partial<UserRole>) => {
    try {
      const response = await createUserRole(data);
      if (response.success && response.data) {
        const newRole = {
          id: response.data.id,
          name: response.data.name,
          icon: getRoleIcon(response.data.name)
        };
        setRoles(prev => [newRole, ...prev]);
        return newRole;
      } else {
        throw new Error(response.error || 'Failed to create user role');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create user role');
    }
  };

  const update = async (id: string, data: Partial<UserRole>) => {
    try {
      const response = await updateUserRole(id, data);
      if (response.success && response.data) {
        const updatedRole = {
          id: response.data.id,
          name: response.data.name,
          icon: getRoleIcon(response.data.name)
        };
        setRoles(prev => 
          prev.map(role => role.id === id ? updatedRole : role)
        );
        return updatedRole;
      } else {
        throw new Error(response.error || 'Failed to update user role');
      }
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

  // Hook to get current user's roles
  const useCurrentUserRoles = () => {
    const [currentRoles, setCurrentRoles] = useState<UserRole[]>([]);
    const [isCurrentLoading, setIsCurrentLoading] = useState(true);
    const [currentError, setCurrentError] = useState<Error | null>(null);

    const fetchCurrentRoles = useCallback(async () => {
      try {
        setIsCurrentLoading(true);
        setCurrentError(null);
        const response = await getCurrentUserRoles();
        if (response.success && response.data) {
          setCurrentRoles(response.data);
        } else {
          throw new Error(response.error || 'Failed to fetch current user roles');
        }
      } catch (err) {
        setCurrentError(err instanceof Error ? err : new Error('Failed to fetch current user roles'));
      } finally {
        setIsCurrentLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchCurrentRoles();
    }, [fetchCurrentRoles]);

    return {
      currentRoles,
      isCurrentLoading,
      currentError,
      refreshCurrentRoles: fetchCurrentRoles
    };
  };

  return {
    roles,
    isLoading,
    create,
    update,
    remove,
    useCurrentUserRoles
  };
}
