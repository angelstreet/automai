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
      console.log('RoleContext: Initializing user role from user data:', user);
      
      // Role and other metadata fields are already extracted 
      // into the top-level user object in auth.ts
      if (user.role) {
        console.log('RoleContext: Found role directly on user object:', user.role);
        
        // If admin role is found, prioritize it
        if (user.role === 'admin') {
          console.log('RoleContext: Setting admin role from user object');
          setRoleState('admin');
          return;
        }
        
        // Ensure the role is a valid Role type
        if (isValidRole(user.role)) {
          console.log('RoleContext: Setting validated role from user object:', user.role);
          setRoleState(user.role as Role);
          return;
        }
      }
      
      // Fetch from the database as fallback
      const fetchRoleFromDB = async () => {
        try {
          console.log('RoleContext: Fetching role from database');
          const response = await getCurrentUserRoles();
          console.log('RoleContext: Database role response:', response);
          
          if (response.success && response.data && response.data.length > 0) {
            const dbRole = response.data[0].name;
            console.log('RoleContext: Role from database:', dbRole);
            
            // If admin role is found in DB, prioritize it
            if (dbRole === 'admin') {
              console.log('RoleContext: Setting admin role from database');
              setRoleState('admin');
              return;
            }
            
            // Ensure the role from DB is a valid Role type
            if (isValidRole(dbRole)) {
              console.log('RoleContext: Setting validated role from database:', dbRole);
              setRoleState(dbRole as Role);
              return;
            }
          }
          
          // If we get here, use the default role
          console.log('RoleContext: No valid role found, using default:', DEFAULT_ROLE);
          setRoleState(DEFAULT_ROLE);
        } catch (error) {
          console.error('RoleContext: Error fetching user role:', error);
          // Default to DEFAULT_ROLE if there's an error
          setRoleState(DEFAULT_ROLE);
        }
      };
      
      // If we didn't find a valid role on the user object, fetch from DB
      fetchRoleFromDB();
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