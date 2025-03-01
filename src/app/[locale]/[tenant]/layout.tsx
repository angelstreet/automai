'use client';

import Cookies from 'js-cookie';
import * as React from 'react';

import { AppSidebar } from '@/components/Layout/AppSidebar';
import { WorkspaceHeader } from '@/components/Layout/WorkspaceHeader';
import SidebarProvider from '@/components/sidebar/SidebarProvider';
import { TooltipProvider } from '@/components/Shadcn/tooltip';
import { useUser } from '@/context/UserContext';

// Cache session check timestamp to reduce API calls
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastSessionCheck = 0;

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string; locale: string }>;
}) {
  const { tenant, locale } = React.use(params);
  const { user, isLoading, error, checkSession } = useUser();
  const [loadingError, setLoadingError] = React.useState<string | null>(null);

  // Check session only at intervals to reduce API calls
  React.useEffect(() => {
    const now = Date.now();
    if (now - lastSessionCheck > SESSION_CHECK_INTERVAL) {
      try {
        checkSession();
        lastSessionCheck = now;
      } catch (err) {
        console.error('Error checking session:', err);
        setLoadingError('Failed to check session');
      }
    }
  }, [checkSession]);

  // Log important state for debugging
  React.useEffect(() => {
    console.log('TenantLayout state:', { 
      isLoading, 
      hasUser: !!user, 
      error,
      tenant,
      locale
    });
  }, [isLoading, user, error, tenant, locale]);

  // Only show loading state while user data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error || loadingError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">Error: {error || loadingError}</div>
        <button 
          className="px-4 py-2 bg-primary text-white rounded"
          onClick={() => {
            window.location.href = `/${locale}/login`;
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // If no user, let RouteGuard handle the redirect
  if (!user) {
    console.log('No user found in TenantLayout, returning null');
    return null;
  }

  const sidebarState = Cookies.get('sidebar:state') !== 'false';

  return (
    <SidebarProvider defaultOpen={sidebarState}>
      <TooltipProvider>
        <div className="relative flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
            <WorkspaceHeader tenant={tenant} />
            <main className="flex-1 p-4 w-full max-w-full">{children}</main>
          </div>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}
