import * as React from 'react';
import { Suspense } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { TooltipProvider } from '@/components/shadcn/tooltip';
import { ToasterProvider } from '@/components/shadcn/toaster';
import TenantLayoutClient from './_components/client/TenantLayoutClient';
import { getUser } from '@/app/actions/user';
import { AppSidebarSkeleton } from '@/components/layout/AppSidebarSkeleton';
import { WorkspaceHeaderSkeleton } from '@/components/layout/WorkspaceHeaderSkeleton';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string; locale: string };
}) {
  const tenant = params.tenant;
  const user = await getUser();

  // Server-side logging
  console.log('[TenantLayout] Rendering tenant layout, tenant:', tenant);

  return (
    <TenantLayoutClient user={user} tenant={tenant}>
      <TooltipProvider>
        <ToasterProvider />
        <div className="relative flex min-h-screen w-full">
          <Suspense fallback={<AppSidebarSkeleton />}>
            <AppSidebar user={user} />
          </Suspense>
          <div
            className="flex-1 flex flex-col min-w-0 w-full overflow-hidden transition-[margin,width] duration-300 ease-in-out"
            style={{
              marginLeft: 'var(--sidebar-width-offset, 0)',
              width: 'calc(100% - var(--sidebar-width-offset, 0))',
              opacity: 1,
            }}
          >
            <Suspense fallback={<WorkspaceHeaderSkeleton />}>
              <WorkspaceHeader tenant={tenant} user={user} />
            </Suspense>
            <main className="flex-1 px-3 py-0 w-full max-w-full border border-gray-30 rounded-md">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </TenantLayoutClient>
  );
}
