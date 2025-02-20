'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { WorkspaceHeader } from '@/components/layout/workspace-header';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarExpanded, setSidebarExpanded] = React.useState(true);

  return (
    <div className="relative flex min-h-screen">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div className="flex flex-1 flex-col">
        <WorkspaceHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
} 