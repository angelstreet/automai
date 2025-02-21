'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { WorkspaceHeader } from '@/components/layout/workspace-header';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string; locale: string }>;
}) {
  const [sidebarExpanded, setSidebarExpanded] = React.useState(true);
  const resolvedParams = React.use(params);

  return (
    <TooltipProvider>
      <div className="relative flex min-h-screen w-full">
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
          <WorkspaceHeader tenant={resolvedParams.tenant} />
          <main className="flex-1 p-6 w-full max-w-full">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
} 