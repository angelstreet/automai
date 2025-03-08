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
import { useToast } from '@/components/shadcn/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Code2, Building2, Factory } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  icon?: React.ReactNode;
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
      const data = await getUserRoles(user.id);
      
      // Map database roles to UI roles with icons
      const rolesWithIcons = data.map(role => ({
        id: role.id,
        name: role.name,
        icon: getRoleIcon(role.name),
      }));

      setRoles(rolesWithIcons);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user roles',
        variant: 'destructive',
      });
      // Set default roles if fetch fails
      setRoles([
        { id: 'user', name: 'User', icon: <Code2 className="h-4 w-4" /> },
        { id: 'admin', name: 'Admin', icon: <Building2 className="h-4 w-4" /> },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Helper function to get role icon
  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <Building2 className="h-4 w-4" />;
      case 'developer':
        return <Code2 className="h-4 w-4" />;
      case 'operator':
        return <Factory className="h-4 w-4" />;
      default:
        return <Code2 className="h-4 w-4" />;
    }
  };

  // Fetch roles on mount or when user changes
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
    isLoading,
    create,
    update,
    remove,
    useCurrentUserRoles
  };
}
