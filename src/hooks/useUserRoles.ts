'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { 
  getUserRoles,
  createUserRole,
  updateUserRole,
  deleteUserRole,
  getCurrentUserRoles,
} from '@/app/actions/user';
import { UserRole, UIRole } from '@/types/user';
import { useToast } from '@/components/shadcn/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/context/RoleContext';

export function useUserRoles() {
  const [roles, setRoles] = useState<UIRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { role: currentRole, setRole: setCurrentRole } = useRole();
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
        
        // Update the current role in context if needed
        if (response.data.length > 0 && response.data[0].name !== currentRole) {
          setCurrentRole(response.data[0].name as any);
        }
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
      // Set default role if fetch fails
      setRoles([
        { id: user.id, name: 'user', icon: getRoleIcon('user') },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, currentRole, setCurrentRole]);

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
      // Ensure the user ID is set
      const roleData = { ...data, id: user?.id };
      
      const response = await createUserRole(roleData);
      if (response.success && response.data) {
        const newRole: UIRole = {
          id: response.data.id,
          name: response.data.name,
          icon: getRoleIcon(response.data.name)
        };
        setRoles([newRole]);
        
        // Update the current role in context
        setCurrentRole(response.data.name as any);
        
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
        const updatedRole: UIRole = {
          id: response.data.id,
          name: response.data.name,
          icon: getRoleIcon(response.data.name)
        };
        setRoles([updatedRole]);
        
        // Update the current role in context
        setCurrentRole(response.data.name as any);
        
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
      
      // Reset to default role
      const defaultRole: UIRole = { id: user?.id || 'default', name: 'user', icon: getRoleIcon('user') };
      setRoles([defaultRole]);
      
      // Update the current role in context
      setCurrentRole('user');
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
    useCurrentUserRoles,
    refreshRoles: fetchRoles
  };
}
