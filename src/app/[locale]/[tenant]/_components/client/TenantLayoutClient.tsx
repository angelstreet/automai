'use client';

import { ReactNode } from 'react';

import { PermissionProvider } from '@/context/PermissionContext';
import { TeamProvider } from '@/context/TeamContext';
import { User } from '@/types/user';

// This client component wraps the layout and provides client-side context providers
export default function TenantLayoutClient({
  children,
  user,
}: {
  children: ReactNode;
  user: User | null;
}) {
  return (
    <TeamProvider>
      <PermissionProvider>{children}</PermissionProvider>
    </TeamProvider>
  );
}
