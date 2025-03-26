'use client';

import { ReactNode } from 'react';
import { User } from '@/types/user';

// This client component wraps the layout and provides any client-side functionality needed
export default function TenantLayoutClient({
  children,
  user,
  tenant,
}: {
  children: ReactNode;
  user: User | null;
  tenant: string;
}) {
  // In the future, you might add client-side state or handlers here
  
  return <>{children}</>;
}