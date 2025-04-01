'use client';

import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/sidebar';
import { SidebarNavGroup } from '@/components/sidebar/SidebarNavGroup';
import { SidebarUserProfile } from '@/components/sidebar/SidebarUserProfile';
import { APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_ICON } from '@/components/sidebar/constants';
import { sidebarData } from '@/components/sidebar/sidebarData';
import TeamSelector from '@/components/team/TeamSelector';
import { TeamSwitcher } from '@/components/team/TeamSwitcher';
import { useSidebar, useUser } from '@/hooks';
import { cn } from '@/lib/utils';
import { User } from '@/types/service/userServiceType';

interface SidebarClientProps {
  user?: User | null;
}

// Wrap the component with React.memo to prevent unnecessary re-renders
const SidebarClient = React.memo(function SidebarClient({ user: propUser }: SidebarClientProps) {
  const userContext = useUser();
  // Use prop user if available, otherwise fall back to context
  const user = propUser || userContext?.user || null;
  const { open } = useSidebar();

  // Simplified role resolution
  const effectiveRole = user?.role || 'viewer';

  // Filter navigation groups based on role - simplified
  const filteredNavigation = React.useMemo(() => {
    return sidebarData.navGroups
      .map((group) => {
        // Filter items based on role
        const filteredItems = group.items.filter((item) => {
          // If no roles specified, show to everyone
          if (!item.roles || item.roles.length === 0) {
            return true;
          }
          // Otherwise check if user's role is in the allowed roles
          return item.roles.includes(effectiveRole);
        });

        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter((group) => group.items.length > 0); // Remove empty groups
  }, [effectiveRole]);

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="fixed left-0 top-0 z-30 sidebar-visible animate-in fade-in-50 duration-300"
      style={
        {
          '--sidebar-width': APP_SIDEBAR_WIDTH,
          '--sidebar-width-icon': APP_SIDEBAR_WIDTH_ICON,
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="p-1.5">
        <div className="sidebar-header-content flex flex-col gap-2">
          <TeamSwitcher defaultCollapsed={!open} user={user} />
          <TeamSelector />
        </div>
      </SidebarHeader>
      <SidebarContent className={cn('pt-2', !open && 'pt-4')}>
        {filteredNavigation.map((group) => (
          <SidebarNavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="pb-2">
        {user && <SidebarUserProfile tenant={user.tenant_name} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});

export { SidebarClient };
