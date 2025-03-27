'use client';

import { ReactNode } from 'react';
import { User } from '@/types/user';
import { TeamProvider } from '@/context';

// This client component wraps the layout and provides client-side context providers
export default function TenantLayoutClient({
  children,
  user,
  tenant,
}: {
  children: ReactNode;
  user: User | null;
  tenant: string;
}) {
  return (
    <TeamProvider user={user} tenant={tenant}>
      {children}
    </TeamProvider>
  );
}
