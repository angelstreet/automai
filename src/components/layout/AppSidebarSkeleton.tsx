'use client';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/sidebar';

import { APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_ICON } from '../sidebar/constants';

export function AppSidebarSkeleton() {
  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="fixed left-0 top-0 z-30 animate-in fade-in-50 duration-500"
      style={
        {
          '--sidebar-width': APP_SIDEBAR_WIDTH,
          '--sidebar-width-icon': APP_SIDEBAR_WIDTH_ICON,
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="p-1.5">
        <div className="h-10 bg-muted/30 rounded-md animate-pulse" />
      </SidebarHeader>
      <SidebarContent className="pt-2">
        {/* Simulate navigation groups with loading skeletons */}
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="px-2 py-1 mb-4">
              <div className="h-4 w-24 bg-muted/30 rounded-md animate-pulse mb-3" />
              {Array(i + 2)
                .fill(0)
                .map((_, j) => (
                  <div key={j} className="h-8 bg-muted/20 rounded-md animate-pulse mb-2 mx-1" />
                ))}
            </div>
          ))}
      </SidebarContent>
      <SidebarFooter className="pb-2">
        <div className="h-10 mx-auto w-[90%] bg-muted/30 rounded-md animate-pulse" />
      </SidebarFooter>
    </Sidebar>
  );
}
