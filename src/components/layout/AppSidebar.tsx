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
      // REMOVAL: Clearing any existing debug_role in localStorage to use the actual user role
      if (localStorage.getItem('debug_role')) {
        console.log('DEBUG AppSidebar - Removing stored debug_role from localStorage to use actual user role');
        localStorage.removeItem('debug_role');
      }
      
      // Also check cached user data
      try {
        const cachedUserStr = localStorage.getItem('cached_user');
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          console.log('DEBUG AppSidebar - Cached user data:', {
            hasData: !!cachedUser,
            cachedRole: cachedUser?.role,
            timestamp: localStorage.getItem('cached_user_time')
          });
        } else {
          console.log('DEBUG AppSidebar - No cached user data found in localStorage');
        }
      } catch (err) {
        console.error('DEBUG AppSidebar - Error parsing cached user:', err);
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

  // FIXED: User's actual role should take precedence over debug role
  // Only use debug role for testing if explicitly requested
  const effectiveRole = user?.role || debugRole || 'viewer';
  
  // Force remove any cached debug role that might be interfering
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.__debugRole) {
        console.log('DEBUG AppSidebar - Clearing window.__debugRole');
        window.__debugRole = null;
      }
    }
  }, []);
  
  // DEBUG: Log role information whenever it changes
  React.useEffect(() => {
    console.log('DEBUG AppSidebar - Role information:', {
      debugRole,
      userRole: user?.role,
      effectiveRole,
      localStorage: typeof window !== 'undefined' ? localStorage.getItem('debug_role') : null,
      userInLocalStorage: typeof window !== 'undefined' ? !!localStorage.getItem('cached_user') : null,
    });
  }, [debugRole, user?.role, effectiveRole]);

  // Filter navigation groups based on role
  const filteredNavigation = React.useMemo(() => {
    // DEBUG: Log navigation filtering
    console.log('DEBUG AppSidebar - Filtering navigation with role:', effectiveRole);
    
    const result = sidebarData.navGroups
      .map((group) => {
        // Filter items based on role
        const filteredItems = group.items.filter((item) => {
          // If no roles specified, show to everyone
          if (!item.roles || item.roles.length === 0) {
            return true;
          }
          // Otherwise check if user's role is in the allowed roles
          const hasAccess = item.roles.includes(effectiveRole);
          
          // DEBUG: Log item filtering for admin section
          if (group.title === 'Admin') {
            console.log(`DEBUG AppSidebar - Admin item "${item.title}" access:`, {
              hasAccess,
              itemRoles: item.roles,
              userRole: effectiveRole
            });
          }
          
          return hasAccess;
        });
        
        return {
          ...group,
          items: filteredItems
        };
      })
      .filter((group) => group.items.length > 0); // Remove empty groups
    
    // DEBUG: Log filtered navigation results
    console.log('DEBUG AppSidebar - Filtered navigation result:', {
      totalGroups: result.length,
      groups: result.map(g => g.title),
      hasAdminGroup: result.some(g => g.title === 'Admin')
    });
    
    return result;
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
