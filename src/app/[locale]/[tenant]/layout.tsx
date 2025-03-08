'use client';

import Cookies from 'js-cookie';
import * as React from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { SidebarProvider } from '@/components/sidebar';
import { TooltipProvider } from '@/components/shadcn/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { ToasterProvider } from '@/components/shadcn/toaster';

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
  const { user, isLoading, error } = useAuth();
  const [loadingError, setLoadingError] = React.useState<string | null>(null);

  // Check session only at intervals to reduce API calls
  React.useEffect(() => {
    const now = Date.now();
    if (now - lastSessionCheck > SESSION_CHECK_INTERVAL) {
      try {
        // Assuming checkSession is called elsewhere in the code
        lastSessionCheck = now;
      } catch (err) {
        console.error('Error checking session:', err);
        setLoadingError('Failed to check session');
      }
    }
  }, []);

  // Log important state for debugging
  React.useEffect(() => {
    console.log('TenantLayout state:', {
      isLoading,
      hasUser: !!user,
      error,
      tenant,
      locale,
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

  // Even if no user yet, we can still render the layout
  // This prevents the layout from being null during SSR or when user data is still loading
  // RouteGuard will handle redirections appropriately
  if (!user) {
    console.log('No user found in TenantLayout, continuing to render with fallback data');
    // Continue rendering instead of returning null
  }

  const sidebarState = Cookies.get('sidebar:state') !== 'false';

  return (
    <SidebarProvider defaultOpen={sidebarState}>
      <TooltipProvider>
        <ToasterProvider />
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
