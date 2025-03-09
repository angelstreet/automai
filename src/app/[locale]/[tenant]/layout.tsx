'use client';

import * as React from 'react';
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
  return (
    <RoleProvider>
      <SidebarProvider>
        <TooltipProvider>
          <ToasterProvider />
          <div className="relative flex min-h-screen w-full">
            <AppSidebar />
            <div 
              className="flex-1 flex flex-col min-w-0 w-full overflow-hidden transition-all duration-200"
              style={{ 
                marginLeft: 'var(--sidebar-width-offset, 0)',
                width: 'calc(100% - var(--sidebar-width-offset, 0))'
              }}
            >
              <WorkspaceHeader />
              <main className="flex-1 px-3 py-4 w-full max-w-full">{children}</main>
            </div>
          </div>
        </TooltipProvider>
      </SidebarProvider>
    </RoleProvider>
  );
}
