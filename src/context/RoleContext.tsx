import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

import { useUser } from '@/context/UserContext';

export type Role = 'admin' | 'developer' | 'tester' | 'viewer';

interface RoleContextType {
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>('viewer');
  const { user, isLoading } = useUser();

  // Update role when user data is loaded
  useEffect(() => {
    if (user && user.role) {
      // Convert role to lowercase and ensure it's a valid Role type
      const userRole = user.role.toLowerCase() as Role;
      if (
        userRole === 'admin' ||
        userRole === 'developer' ||
        userRole === 'tester' ||
        userRole === 'viewer'
      ) {
        setCurrentRole(userRole);
      }
    }
  }, [user]);

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole }}>{children}</RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
