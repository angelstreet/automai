'use client';

import * as React from 'react';

import { NavGroup } from '@/components/layout/NavGroup';
import { NavUser } from '@/components/layout/NavUser';
import TeamSelector from '@/components/team/TeamSelector';
import { TeamSwitcher } from '@/components/layout/TeamSwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/navigation/sidebar';
import { sidebarData } from '@/components/navigation/sidebar/sidebarData';
import { useUser } from '@/context';
import { User } from '@/types/user';

import {
  APP_SIDEBAR_WIDTH,
  APP_SIDEBAR_WIDTH_ICON,
} from '@/components/navigation/sidebar/constants';

interface AppSidebarClientProps {
  user?: User | null;
}

// Wrap the component with React.memo to prevent unnecessary re-renders
const AppSidebarClient = React.memo(function AppSidebarClient({
  user: propUser,
}: AppSidebarClientProps) {
  const userContext = useUser();
  // Use prop user if available, otherwise fall back to context
  const user = propUser || userContext?.user || null;
  const { open } = useSidebar();

  // Use state for isCollapsed to ensure hydration consistency
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Update isCollapsed after initial render to prevent hydration mismatch
  React.useEffect(() => {
    setIsCollapsed(!open);
  }, [open]);

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

  // Always ensure sidebar is visible, without unnecessary transitions
  const sidebarClassName =
    'fixed left-0 top-0 z-30 sidebar-visible animate-in fade-in-50 duration-300';

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className={sidebarClassName}
      style={
        {
          '--sidebar-width': APP_SIDEBAR_WIDTH,
          '--sidebar-width-icon': APP_SIDEBAR_WIDTH_ICON,
        } as React.CSSProperties
      }
    >
      {!isCollapsed && (
        <SidebarHeader className="p-1.5 flex flex-col gap-2">
          <TeamSwitcher defaultCollapsed={!open} user={user} />
          <TeamSelector />
        </SidebarHeader>
      )}
      <SidebarContent className={isCollapsed ? 'pt-4' : 'pt-2'}>
        {filteredNavigation.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="pb-2">{user && <NavUser user={user} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});

export { AppSidebarClient };
