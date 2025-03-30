'use client';

import { ReactNode } from 'react';

import { TeamProvider } from '@/context/TeamContext';
import { UserProvider } from '@/context/UserContext';
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
    <UserProvider initialUser={user}>
      <TeamProvider>{children}</TeamProvider>
    </UserProvider>
  );
}
