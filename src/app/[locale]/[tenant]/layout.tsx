'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { SidebarProvider } from '@/components/sidebar';
import { TooltipProvider } from '@/components/shadcn/tooltip';
import { ToasterProvider } from '@/components/shadcn/toaster';
import { RoleProvider } from '@/context/RoleContext';

export default function TenantLayout({
  children,
  _params,
}: {
  children: React.ReactNode;
  _params: Promise<{ tenant: string; locale: string }>;
}) {
  const params = useParams();
  const tenant = params.tenant as string;
  
  return (
    <RoleProvider>
      <SidebarProvider>
        <TooltipProvider>
          <ToasterProvider />
          <div className="relative flex min-h-screen w-full">
            <AppSidebar />
            <div 
              className="flex-1 flex flex-col min-w-0 will-change-transform"
              style={{ 
                marginLeft: 'var(--sidebar-width-offset, 0)',
                width: 'calc(100% - var(--sidebar-width-offset, 0))',
                transition: 'margin-left 0.2s ease, width 0.2s ease'
              }}
            >
              <WorkspaceHeader tenant={tenant} />
              <main className="flex-1 px-3 py-4 w-full max-w-full overflow-hidden border border-gray-200 rounded-md">
                {children}
              </main>
            </div>
          </div>
        </TooltipProvider>
      </SidebarProvider>
    </RoleProvider>
  );
}
