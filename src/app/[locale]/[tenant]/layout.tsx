'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { WorkspaceHeader } from '@/components/layout/workspace-header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useUser } from '@/lib/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';

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
  const [sidebarExpanded, setSidebarExpanded] = React.useState(true);

  React.use(params);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated, redirect to login
        router.push(`/${locale}/login`);
        return;
      }

      // Check if user has access to this tenant
      const userTenant = user.tenantId ? user.tenantId : user.plan.toLowerCase();
      if (tenant !== userTenant && tenant !== 'trial' && tenant !== 'pro') {
        // User doesn't have access to this tenant, redirect to their correct tenant
        const correctTenant = user.tenantId || (user.plan === 'TRIAL' ? 'trial' : 'pro');
        router.push(`/${locale}/${correctTenant}/dashboard`);
      }
    }
  }, [user, isLoading, router, locale, tenant]);

  // Show nothing while checking auth
  if (isLoading) {
    return null;
  }

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="relative flex min-h-screen w-full">
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
          <WorkspaceHeader tenant={tenant} />
          <main className="flex-1 p-6 w-full max-w-full">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
} 