import { Suspense } from 'react';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppSidebarSkeleton } from '@/components/layout/AppSidebarSkeleton';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { WorkspaceHeaderSkeleton } from '@/components/workspace/WorkspaceHeaderSkeleton';

import { TenantDataProvider } from './_components/TenantDataProvider';
import TenantLayoutClient from './_components/client/TenantLayoutClient';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string; locale: string };
}) {
  return (
    <TenantDataProvider params={params}>
      {(userData) => (
        <TenantLayoutClient
          user={userData.user}
          teams={userData.teams}
          activeTeam={userData.activeTeam}
        >
          <Suspense fallback={<AppSidebarSkeleton />}>
            <AppSidebar user={userData.user} />
          </Suspense>
          <div
            className="flex-1 flex flex-col w-full overflow-hidden transition-[margin,width] duration-300 ease-in-out"
            style={{
              marginLeft: 'var(--sidebar-width-offset, 0)',
              width: 'calc(100% - var(--sidebar-width-offset, 0))',
              opacity: 1,
            }}
          >
            <Suspense fallback={<WorkspaceHeaderSkeleton />}>
              <WorkspaceHeader user={userData.user} />
            </Suspense>
            <div className="flex-1 px-3 pb-2 overflow-hidden">
              <main className="h-full w-full max-w-full border border-gray-30 rounded-md overflow-auto pl-3 pr-3">
                {children}
              </main>
            </div>
          </div>
        </TenantLayoutClient>
      )}
    </TenantDataProvider>
  );
}
