'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Role = 'admin' | 'user' | 'developer' | 'operator';

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

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext); 