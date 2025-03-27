'use client';

import { ReactNode } from 'react';
import { User } from '@/types/user';

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
  return children;
}
