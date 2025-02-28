'use client';

import * as React from 'react';
import { AppSidebar } from '@/components/Layout/AppSidebar';
import { WorkspaceHeader } from '@/components/Layout/WorkspaceHeader';
import { TooltipProvider } from '@/components/Shadcn/tooltip';
import { SidebarProvider } from '@/components/sidebar';
import { useUser } from '@/context/UserContext';
import Cookies from 'js-cookie';

// Cache session check timestamp to reduce API calls
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastSessionCheck = 0;

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string; locale: string };
}) {
  const { user, isLoading, checkSession } = useUser();

  // Check session only at intervals to reduce API calls
  React.useEffect(() => {
    const now = Date.now();
    if (now - lastSessionCheck > SESSION_CHECK_INTERVAL) {
      checkSession();
      lastSessionCheck = now;
    }
  }, [checkSession]);

  // Only show loading state while user data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, let RouteGuard handle the redirect
  if (!user) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="relative flex min-h-screen w-full">
        <SidebarProvider defaultOpen={Cookies.get('sidebar:state') !== 'false'}>
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
            <WorkspaceHeader tenant={params.tenant} />
            <main className="flex-1 p-4 w-full max-w-full">{children}</main>
          </div>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  );
}
