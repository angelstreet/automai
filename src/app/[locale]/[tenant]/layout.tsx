'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { SidebarProvider } from '@/components/sidebar';
import { TooltipProvider } from '@/components/shadcn/tooltip';
import { ToasterProvider } from '@/components/shadcn/toaster';
// UserProvider is now handled by AppContext
// import { UserProvider } from '@/context/UserContext';
import { AppProvider } from '@/context';

export default function TenantLayout({
  children,
  _params,
}: {
  children: React.ReactNode;
  _params: Promise<{ tenant: string; locale: string }>;
}) {
  const params = useParams();
  const tenant = params.tenant as string;

  console.log('[TenantLayout] Rendering tenant layout, tenant:', tenant);

  return (
    <SidebarProvider>
      <AppProvider>
        <TooltipProvider>
          <ToasterProvider />
          <div className="relative flex min-h-screen w-full">
            <AppSidebar />
            <div
              className="flex-1 flex flex-col min-w-0 w-full overflow-hidden transition-[margin,width] duration-300 ease-in-out"
              style={{
                marginLeft: 'var(--sidebar-width-offset, 0)',
                width: 'calc(100% - var(--sidebar-width-offset, 0))',
                opacity: 1,
              }}
            >
              <WorkspaceHeader tenant={tenant} />
              <main className="flex-1 px-3 py-0 w-full max-w-full border border-gray-30 rounded-md">
                {children}
              </main>
            </div>
          </div>
        </TooltipProvider>
      </AppProvider>
    </SidebarProvider>
  );
}
