'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/user';
import { getCurrentUserRoles } from '@/app/actions/user';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

// Default role that matches the Role type
const DEFAULT_ROLE: Role = 'viewer';

const RoleContext = createContext<RoleContextType>({
  role: DEFAULT_ROLE,
  setRole: () => null,
});

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [role, setRoleState] = useState<Role>(DEFAULT_ROLE);
  const { user, loading } = useAuth();

  // Use useCallback to memoize the setRole function
  const setRole = useCallback((newRole: Role) => {
    // Only update if the role actually changed
    setRoleState(prevRole => {
      if (prevRole === newRole) return prevRole;
      return newRole;
    });
  }, []);

  // Effect to set the initial role from the user object
  useEffect(() => {
    if (user && !loading) {
      // First try to get the role from user metadata
      const metadata = user.user_metadata as any;
      const metadataRole = metadata?.role || metadata?.user_role;
      
      if (metadataRole) {
        // Ensure the role is a valid Role type
        const validRole = isValidRole(metadataRole) ? metadataRole : DEFAULT_ROLE;
        setRoleState(validRole);
      } else {
        // If not found in metadata, fetch from the database
        const fetchRoleFromDB = async () => {
          try {
            const response = await getCurrentUserRoles();
            if (response.success && response.data && response.data.length > 0) {
              // Ensure the role from DB is a valid Role type
              const dbRole = response.data[0].name;
              const validRole = isValidRole(dbRole) ? dbRole as Role : DEFAULT_ROLE;
              setRoleState(validRole);
            }
          } catch (error) {
            console.error('Error fetching user role:', error);
            // Default to DEFAULT_ROLE if there's an error
            setRoleState(DEFAULT_ROLE);
          }
        };
        
        fetchRoleFromDB();
      }
    }
  }, [user, loading]);

  // Helper function to check if a role is valid
  const isValidRole = (role: string): role is Role => {
    return ['admin', 'tester', 'developer', 'viewer'].includes(role);
  };

  // Create a memoized context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    role,
    setRole
  }), [role, setRole]);

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext); 