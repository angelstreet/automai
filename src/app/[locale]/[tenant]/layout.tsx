import { Suspense } from 'react';

import { getUser } from '@/app/actions/userAction';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppSidebarSkeleton } from '@/components/layout/AppSidebarSkeleton';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { WorkspaceHeaderSkeleton } from '@/components/workspace/WorkspaceHeaderSkeleton';
import {  mapAuthUserToUser  } from '@/types/component/userComponentType';

import TenantLayoutClient from './_components/client/TenantLayoutClient';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string; locale: string };
}) {
  const { tenant } = params;
  
  // Get minimal initial data
  const authUser = await getUser();
  const initialUser = authUser ? mapAuthUserToUser(authUser) : null;

  return (
    <TenantLayoutClient
      initialUser={initialUser}
      tenant={tenant}
    >
      <Suspense fallback={<AppSidebarSkeleton />}>
        <AppSidebar />
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
          <WorkspaceHeader />
        </Suspense>
        <div className="flex-1 px-3 pb-2 overflow-hidden">
          <main className="h-full w-full max-w-full border border-gray-30 rounded-md overflow-auto pl-3 pr-3">
            {children}
          </main>
        </div>
      </div>
    </TenantLayoutClient>
  );
}
