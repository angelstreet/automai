'use client';

import { createContext } from 'react';

import type { CICDProvider } from '@/types/component/cicdComponentType';

/**
 * CICD context type definition
 * This is a minimal type definition for the context
 * No business logic belongs here, that goes in hooks/useCICD.ts
 */
export interface CICDContextType {
  providers: CICDProvider[];
  isLoading: boolean;
}

/**
 * Context definition with default values
 * Used by CICDProvider in /app/providers/CICDProvider.tsx
 * Business logic should be imported from '@/hooks/useCICD'
 */
export const CICDContext = createContext<CICDContextType>({
  providers: [],
  isLoading: false,
});
