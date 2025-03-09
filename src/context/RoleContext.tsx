'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/user';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: 'user',
  setRole: () => null,
});

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [role, setRole] = useState<Role>('user');
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      // Get the role from the user object
      const userRole = user.user_metadata?.role || user.role || 'user';
      setRole(userRole as Role);
    }
  }, [user, loading]);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext); 