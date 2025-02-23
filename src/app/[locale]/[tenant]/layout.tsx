'use client';

import * as React from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { WorkspaceHeader } from '@/components/layout/workspace-header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUser } from '@/lib/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Cookies from 'js-cookie';

export default function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string; locale: string }>;
}) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const paramsFromNext = useParams();
  const locale = paramsFromNext.locale as string;
  const tenant = paramsFromNext.tenant as string;

  React.use(params);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated, redirect to login
        router.push(`/${locale}/login`);
        return;
      }

      // Determine the correct tenant
      const correctTenant = user.tenantName || (user.plan?.toLowerCase() === 'trial' ? 'trial' : 'pro');
      
      // Only redirect if we're not already on the correct path and not in a redirect loop
      if (tenant !== correctTenant && !sessionStorage.getItem('isRedirecting')) {
        sessionStorage.setItem('isRedirecting', 'true');
        router.push(`/${locale}/${correctTenant}/dashboard`);
        return;
      }
      
      // Clear the redirect flag once we're on the correct path
      if (tenant === correctTenant) {
        sessionStorage.removeItem('isRedirecting');
      }
    }
  }, [user, isLoading, router, locale, tenant]);

  // Show nothing while checking auth
  if (isLoading || !user) {
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