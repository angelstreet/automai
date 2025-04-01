'use client';

import * as React from 'react';

import { NavGroup } from '@/components/layout/NavGroup';
import { NavUser } from '@/components/layout/NavUser';
import { TeamSwitcher } from '@/components/team/TeamSwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/sidebar';
import { APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_ICON } from '@/components/sidebar/constants';
import { sidebarData } from '@/components/sidebar/sidebarData';
import TeamSelector from '@/components/team/TeamSelector';
import { useUser } from '@/context';
import { User } from '@/types/auth/user';

interface SidebarClientProps {
  user?: User | null;
}

// Wrap the component with React.memo to prevent unnecessary re-renders
const SidebarClient = React.memo(function SidebarClient({ user: propUser }: SidebarClientProps) {
  console.log('[@ui:SidebarClient:render] Rendering SidebarClient');

  const userContext = useUser();
  // Use prop user if available, otherwise fall back to context
  const user = propUser || userContext?.user || null;
  const { open } = useSidebar();

  console.log(
    `[@ui:SidebarClient:render] Initial sidebar state: ${open ? 'expanded' : 'collapsed'}`,
  );

  // Initialize isCollapsed directly from the open state to prevent flashing
  const [isCollapsed, setIsCollapsed] = React.useState(!open);

  // Add a ref to track if this is the first render
  const isFirstRender = React.useRef(true);

  // Debug logging for state changes
  React.useEffect(() => {
    if (isFirstRender.current) {
      console.log(
        `[@ui:SidebarClient:useEffect] First render, isCollapsed=${isCollapsed}, open=${open}`,
      );
      isFirstRender.current = false;
    } else {
      console.log(`[@ui:SidebarClient:useEffect] Updating isCollapsed: ${isCollapsed} → ${!open}`);
    }

    setIsCollapsed(!open);
  }, [open, isCollapsed]);

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

  // Debug logging for render lifecycle
  React.useEffect(() => {
    console.log(`[@ui:SidebarClient:useEffect] Component mounted with isCollapsed=${isCollapsed}`);

    return () => {
      console.log('[@ui:SidebarClient:useEffect] Component unmounting');
    };
  }, [isCollapsed]);

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
      <SidebarHeader className="p-1.5">
        <div className="sidebar-header-content flex flex-col gap-2">
          <TeamSwitcher defaultCollapsed={!open} user={user} />
          <TeamSelector />
        </div>
      </SidebarHeader>
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

export { SidebarClient };
