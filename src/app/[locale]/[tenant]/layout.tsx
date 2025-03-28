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
import { User } from '@/types/user';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string; locale: string };
}) {
  // In Next.js 14+, params can be a Promise that needs to be awaited
  const resolvedParams = 'then' in params ? await params : params;
  const tenant = resolvedParams.tenant;
  const authUser = await getUser();

  // Transform AuthUser to User type
  const user: User | null = authUser
    ? {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name || authUser.email.split('@')[0],
        // Use role directly from authUser if available, otherwise fall back to metadata
        role: ((authUser as any).role || authUser.user_metadata?.role || 'viewer') as User['role'],
        tenant_id: authUser.tenant_id,
        tenant_name: authUser.tenant_name,
        avatar_url: authUser.user_metadata?.avatar_url || '',
        user_metadata: authUser.user_metadata,
      }
    : null;
    
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
