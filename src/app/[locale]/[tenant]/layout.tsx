import { Suspense } from 'react';

import { getUser } from '@/app/actions/userAction';
import { SidebarClient } from '@/components/sidebar/SidebarClient';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/sidebar';
import { APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_ICON } from '@/components/sidebar/constants';
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
      <Suspense fallback={
        <Sidebar
          collapsible="icon"
          variant="floating"
          className="fixed left-0 top-0 z-30 animate-in fade-in-50 duration-500"
          style={{
            '--sidebar-width': APP_SIDEBAR_WIDTH,
            '--sidebar-width-icon': APP_SIDEBAR_WIDTH_ICON,
          } as React.CSSProperties}
        >
          <SidebarHeader className="p-1.5">
            <div className="h-10 bg-muted/30 rounded-md animate-pulse" />
          </SidebarHeader>
          <SidebarContent className="pt-2">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="px-2 py-1 mb-4">
                <div className="h-4 w-24 bg-muted/30 rounded-md animate-pulse mb-3" />
                {Array(i + 2).fill(0).map((_, j) => (
                  <div key={j} className="h-8 bg-muted/20 rounded-md animate-pulse mb-2 mx-1" />
                ))}
              </div>
            ))}
          </SidebarContent>
          <SidebarFooter className="pb-2">
            <div className="h-10 mx-auto w-[90%] bg-muted/30 rounded-md animate-pulse" />
          </SidebarFooter>
        </Sidebar>
      }>
        <SidebarClient user={initialUser} />
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
