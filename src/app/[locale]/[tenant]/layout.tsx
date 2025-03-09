'use client';

import Cookies from 'js-cookie';
import * as React from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { SidebarProvider } from '@/components/sidebar';
import { TooltipProvider } from '@/components/shadcn/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { ToasterProvider } from '@/components/shadcn/toaster';
import { RoleProvider } from '@/context/RoleContext';
import { SIDEBAR_COOKIE_NAME } from '@/components/sidebar/constants';

// Get the initial sidebar state from cookies during module initialization
// This helps prevent hydration mismatches and flickering
const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return true; // Default to open during SSR
  return Cookies.get(SIDEBAR_COOKIE_NAME) !== 'false';
};

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string; locale: string }>;
}) {
  const { tenant, locale } = React.use(params);
  const { user, loading: isLoading, error } = useAuth();
  const [loadingError, setLoadingError] = React.useState<string | null>(null);
  
  // Use a ref to store the initial sidebar state to prevent re-renders
  const initialSidebarState = React.useRef(getInitialSidebarState()).current;

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
        <div className="text-red-500 mb-4">Error: {error?.message || loadingError}</div>
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
  // RouteGuard will handle redirections appropriately
  if (!user) {
    // Continue rendering instead of returning null
  }

  return (
    <RoleProvider>
      <SidebarProvider defaultOpen={initialSidebarState}>
        <TooltipProvider>
          <ToasterProvider />
          <div className="relative flex min-h-screen w-full">
            <AppSidebar />
            <div 
              className="flex-1 flex flex-col min-w-0 w-full overflow-hidden transition-all duration-200"
              style={{ 
                marginLeft: 'var(--sidebar-width-offset, 0)',
                width: 'calc(100% - var(--sidebar-width-offset, 0))'
              }}
            >
              <WorkspaceHeader tenant={tenant} />
              <main className="flex-1 px-3 py-4 w-full max-w-full">{children}</main>
            </div>
          </div>
        </TooltipProvider>
      </SidebarProvider>
    </RoleProvider>
  );
}
