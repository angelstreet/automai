'use client';

import { createContext } from 'react';

import type { PermissionsResult } from '@/types/context/permissionsContextType';

export interface PermissionContextType {
  permissions: PermissionsResult | null;
}

export const PermissionContext = createContext<PermissionContextType>({
  permissions: null,
});
