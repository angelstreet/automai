'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useTranslations } from 'next-intl';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
    tenant: string;
  };
}

export default function TenantLayout({ children, params }: TenantLayoutProps) {
  const { locale, tenant } = params;
  const { user, isLoading, error } = useAuth();
  const router = useRouter();
  const t = useTranslations();
  const [state, setState] = useState({
    isLoading: true,
    hasUser: false,
    error: null as string | null,
    tenant,
    locale
  });

  useEffect(() => {
    // Update state based on auth status
    setState(prev => ({
      ...prev,
      isLoading,
      hasUser: !!user,
      error: error ? error.message : null
    }));

    console.log('TenantLayout state:', {
      isLoading,
      hasUser: !!user,
      error: error ? error.message : null,
      tenant,
      locale
    });

    // If not loading and no user, redirect to login
    if (!isLoading && !user && !error) {
      console.log('No user found in TenantLayout, redirecting to login');
      router.push(`/${locale}/login?callbackUrl=/${locale}/${tenant}/dashboard`);
    }
  }, [isLoading, user, error, locale, tenant, router]);

  // Show loading state
  if (state.isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">{t('Common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (state.error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center max-w-md p-6 bg-destructive/10 rounded-lg border border-destructive">
          <h2 className="text-xl font-semibold text-destructive mb-2">Authentication Error</h2>
          <p className="mb-4">{state.error}</p>
          <button 
            onClick={() => router.push(`/${locale}/login`)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // If we have a user, render the layout
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar 
        user={user} 
        tenant={tenant} 
        locale={locale} 
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <WorkspaceHeader 
          user={user} 
          tenant={tenant} 
          locale={locale} 
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
