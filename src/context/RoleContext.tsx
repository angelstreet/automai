'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type Role = 'admin' | 'developer' | 'tester' | 'viewer';

interface RoleContextType {
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>('viewer');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch user role from the database
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        setIsLoading(true);
        // Fetch user profile from API to get the most up-to-date role
        const response = await fetch('/api/auth/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.user_role) {
            const userRole = data.user_role.toLowerCase() as Role;
            if (
              userRole === 'admin' ||
              userRole === 'developer' ||
              userRole === 'tester' ||
              userRole === 'viewer'
            ) {
              console.log(`RoleContext - Setting role from API: ${userRole}`);
              setCurrentRole(userRole);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
