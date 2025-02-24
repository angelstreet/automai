'use client';

import * as React from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { WorkspaceHeader } from '@/components/layout/workspace-header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUser } from '@/lib/contexts/UserContext';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string; locale: string }>;
}) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  // Properly handle params as a Promise
  const { locale, tenant } = React.use(params);

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
            <WorkspaceHeader tenant={tenant} />
            <main className="flex-1 p-4 w-full max-w-full">{children}</main>
          </div>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  );
}
