import { Suspense } from 'react';

import { getUser } from '@/app/actions/user';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppSidebarSkeleton } from '@/components/layout/AppSidebarSkeleton';
import { WorkspaceHeaderSkeleton } from '@/components/layout/WorkspaceHeaderSkeleton';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { UserProvider } from '@/context/UserContext';
import { mapAuthUserToUser } from '@/utils/user';

import TenantLayoutClient from './_components/client/TenantLayoutClient';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string; locale: string };
}) {
  const { tenant } = await params;
  const authUser = await getUser();
  const user = authUser ? mapAuthUserToUser(authUser) : null;

  console.log('[TenantLayout] Rendering tenant layout, tenant:', tenant);

  return (
    <UserProvider initialUser={user}>
      <TenantLayoutClient user={user}>
        <div className="relative flex w-full overflow-hidden">
          <Suspense fallback={<AppSidebarSkeleton />}>
            <AppSidebar user={user} />
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
              <WorkspaceHeader user={user} />
            </Suspense>
            <div className="flex-1 p-6 overflow-hidden">
              <main className="h-full w-full max-w-full border border-gray-30 rounded-md overflow-auto p-6">
                {children}
              </main>
            </div>
          </div>
        </div>
      </TenantLayoutClient>
    </UserProvider>
  );
}
