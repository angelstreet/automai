'use client';

import { redirect } from 'next/navigation';

import { useSession } from 'next-auth/react';

import { useUser } from '@/context/UserContext';

export default function DashboardRedirect() {
  const { data: session } = useSession();
  const { user } = useUser();

  // Get tenant from user data or default to trial
  const tenant = user?.tenantName || 'trial';

  // Redirect to the proper tenant dashboard
  redirect(`../${tenant}/dashboard`);
}
