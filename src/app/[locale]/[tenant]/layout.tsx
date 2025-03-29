import { Suspense } from 'react';

import { getUser } from '@/app/actions/user';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppSidebarSkeleton } from '@/components/layout/AppSidebarSkeleton';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { WorkspaceHeaderSkeleton } from '@/components/layout/WorkspaceHeaderSkeleton';
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
        <div className="relative flex min-h-screen w-full">
          <Suspense fallback={<AppSidebarSkeleton />}>
            <AppSidebar user={user} />
          </Suspense>
          <div
            className="flex-1 flex flex-col min-w- w-full overflow-hidden transition-[margin,width] duration-300 ease-in-out"
            style={{
              marginLeft: 'var(--sidebar-width-offset, 0)',
              width: 'calc(100% - var(--sidebar-width-offset, 0))',
              opacity: 1,
            }}
          >
            <Suspense fallback={<WorkspaceHeaderSkeleton />}>
              <WorkspaceHeader user={user} />
            </Suspense>
            <main className="flex-1 px-3 py-0 w-full max-w-full border border-gray-30 rounded-md">
              {children}
            </main>
          </div>
        </div>
      </TenantLayoutClient>
    </UserProvider>
  );
}
