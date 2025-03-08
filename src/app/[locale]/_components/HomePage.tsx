'use client';

import { redirect, useParams } from 'next/navigation';
import * as React from 'react';
import type { User } from '@supabase/supabase-js';

import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useAuth } from '@/hooks/useAuth';
import { useTenants } from '@/hooks/useTenants';

import { Features } from '../(marketing)/_components/Features';
import { Hero } from '../(marketing)/_components/Hero';

// Define a type for the user with user_metadata.tenant_name
interface UserWithTenant extends User {
  user_metadata: {
    tenant_name?: string;
    [key: string]: any;
  };
}

export function HomePage() {
  const { user, isLoading } = useAuth();
  const { currentTenant, isLoading: isLoadingTenant } = useTenants();
  const params = useParams();
  const locale = params.locale as string;

  // Show loading state while checking auth
  if (isLoading || isLoadingTenant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  // If user is logged in, redirect to their tenant's dashboard
  if (user && currentTenant) {
    redirect(`/${locale}/${currentTenant.id}/dashboard`);
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
