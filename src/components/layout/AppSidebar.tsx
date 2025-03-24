'use client';

import { useEffect, useMemo } from 'react';
import { NavGroup } from '@/components/layout/NavGroup';
import { NavUser } from '@/components/layout/NavUser';
import { TeamSwitcher } from '@/components/layout/TeamSwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/sidebar';
import { useUser } from '@/context';
import { APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_ICON } from '../sidebar/constants';
import { sidebarData } from '@/components/sidebar/sidebarData';
import * as React from 'react';
import { Role } from '@/types/user';

// Wrap the component with React.memo to prevent unnecessary re-renders
const AppSidebar = React.memo(function AppSidebar() {
  const userContext = useUser();
  const user = userContext?.user || null;
  const { open } = useSidebar();
  // Use state for isCollapsed to ensure hydration consistency
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Use a ref for initial render optimization to avoid double-rendering flicker
  const isInitialRender = React.useRef(true);

  // Determine client-side rendering without state updates that cause re-renders
  const isClient = typeof window !== 'undefined';
  
  // DEBUG: Log user context and role information on mount
  React.useEffect(() => {
    console.log('DEBUG AppSidebar - Mounted with user context:', {
      user: user ? 'exists' : 'null',
      userRole: user?.role || 'no role',
      userContextLoading: userContext?.loading,
      userContextInitialized: userContext?.isInitialized,
      userObject: user,
    });
  }, []);

  // After hydration completes, mark initial render as done
  React.useEffect(() => {
    isInitialRender.current = false;
  }, []);

  // Update isCollapsed after initial render to prevent hydration mismatch
  React.useEffect(() => {
    setIsCollapsed(!open);
  }, [open]);

  // State to track the debug role
  const [debugRole, setDebugRole] = React.useState<Role | null>(() => {
    // Only access localStorage on the client
    return null;
  });

  // Initialize debug role from localStorage after mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('debug_role') as Role;
      if (storedRole) {
        setDebugRole(storedRole);
      }
    }
  }, []);

  // Listen for debug role changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRoleChange = (event: CustomEvent<{ role: Role }>) => {
      console.log('AppSidebar received role change event:', event.detail.role);
      setDebugRole(event.detail.role);
    };

    // Add event listener
    window.addEventListener('debug-role-change', handleRoleChange as EventListener);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('debug-role-change', handleRoleChange as EventListener);
    };
  }, []);

  // Get the effective role - debug role takes precedence if set
  const effectiveRole = debugRole || user?.role || 'viewer';

  // Filter navigation groups based on role
  const filteredNavigation = React.useMemo(() => {
    return sidebarData.navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          // If no roles specified, show to everyone
          if (!item.roles || item.roles.length === 0) return true;
          // Otherwise check if user's role is in the allowed roles
          return item.roles.includes(effectiveRole);
        }),
      }))
      .filter((group) => group.items.length > 0); // Remove empty groups
  }, [effectiveRole]);

  // Always ensure sidebar is visible, with fallback mechanisms
  // This guarantees the sidebar will be shown regardless of hydration state
  const sidebarClassName = `fixed left-0 top-0 z-30 sidebar-visible ${isClient ? 'sidebar-ready' : ''}`;

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
          <TeamSwitcher />
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

// Export the memoized component
export { AppSidebar };
