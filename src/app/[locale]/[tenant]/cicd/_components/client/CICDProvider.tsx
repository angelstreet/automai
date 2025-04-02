'use client';

import { createContext, useContext, ReactNode } from 'react';

interface CICDProviderProps {
  children: ReactNode;
  initialProviders: any[];
  initialLoading?: boolean;
}

interface CICDContextType {
  providers: any[];
  isLoading: boolean;
}

const CICDContext = createContext<CICDContextType | null>(null);

export function CICDProvider({
  children,
  initialProviders,
  initialLoading = false,
}: CICDProviderProps) {
  // Context value
  const value = {
    providers: initialProviders,
    isLoading: initialLoading,
  };

  return <CICDContext.Provider value={value}>{children}</CICDContext.Provider>;
}

export function useCICD(componentName = 'unknown') {
  const context = useContext(CICDContext);

  if (!context) {
    console.error(`[useCICD] Hook used outside of CICDProvider in ${componentName}`);
    throw new Error('useCICD must be used within a CICDProvider');
  }

  return context;
}
