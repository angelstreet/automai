'use client';

import { useMemo } from 'react';
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
import { APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_ICON } from '../../sidebar/constants';
import { sidebarData } from '@/components/sidebar/sidebarData';
import * as React from 'react';
import { Role, User } from '@/types/user';

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
  // Add transition state to prevent flickering on role changes
  const [isTransitioning, setIsTransitioning] = React.useState(true);

  // Check if user context is fully initialized
  const isContextReady = React.useMemo(
    () => userContext?.isInitialized === true || userContext?.user !== null,
    [userContext?.isInitialized, userContext?.user],
  );

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

  // State to track the debug role - always initialize with null for SSR consistency
  const [debugRole, setDebugRole] = React.useState<Role | null>(null);

  // Initialize debug role from localStorage after mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // REMOVAL: Clearing any existing debug_role in localStorage to use the actual user role
      if (localStorage.getItem('debug_role')) {
        console.log(
          'DEBUG AppSidebar - Removing stored debug_role from localStorage to use actual user role',
        );
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
            timestamp: localStorage.getItem('cached_user_time'),
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

  // Initialize with server-safe default value
  const [cachedRole, setCachedRole] = React.useState('viewer');

  // Get role from localStorage only on client after mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedUserStr = localStorage.getItem('cached_user');
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          setCachedRole(cachedUser?.role || 'viewer');
        }
      } catch (e) {
        console.error('Error reading cached user role:', e);
      }
    }
  }, []);

  // FIXED: User's actual role should take precedence over debug role
  // Only use debug role for testing if explicitly requested
  const effectiveRole = React.useMemo(() => {
    // First priority: Use actual user role if available
    if (user?.role) {
      return user.role;
    }

    // Second priority: Use debug role if explicitly set
    if (debugRole) {
      return debugRole;
    }

    // Third priority: Use cached role from localStorage
    if (cachedRole) {
      return cachedRole;
    }

    // Final fallback: Default to viewer
    return 'viewer';
  }, [user?.role, debugRole, cachedRole]);

  // End transition state once we have a real user or after a timeout
  React.useEffect(() => {
    if (user?.role) {
      // User data loaded, end transition immediately
      setIsTransitioning(false);
    } else {
      // Set a timeout to end transition after 750ms regardless
      const timer = setTimeout(() => {
        setIsTransitioning(false);

        // If user data is still missing after timer, attempt to refresh user
        if (!user && userContext?.refreshUser && userContext?.isInitialized) {
          console.log('DEBUG AppSidebar - User data missing after transition, attempting refresh');
          userContext
            .refreshUser()
            .catch((e) => console.error('DEBUG AppSidebar - Error refreshing user:', e));
        }
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [user?.role, userContext?.refreshUser, userContext?.isInitialized]);

  // Force remove any cached debug role that might be interfering
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.__debugRole) {
        console.log('DEBUG AppSidebar - Clearing window.__debugRole');
        window.__debugRole = null;
      }
    }
  }, []);

  // DEBUG: Log role information whenever it changes - but only on client
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('DEBUG AppSidebar - Role information:', {
        debugRole,
        userRole: user?.role,
        cachedRole,
        effectiveRole,
        isTransitioning,
        localStorage: localStorage.getItem('debug_role'),
        userInLocalStorage: !!localStorage.getItem('cached_user'),
      });
    }
  }, [debugRole, user?.role, effectiveRole, isTransitioning, cachedRole]);

  // Filter navigation groups based on role
  const filteredNavigation = React.useMemo(() => {
    // Create a stable version of sidebar data that won't change during SSR/CSR
    const stableSidebarData = sidebarData.navGroups;

    // For debugging on client only
    if (typeof window !== 'undefined') {
      console.log('DEBUG AppSidebar - Filtering navigation with role:', effectiveRole);
    }

    const result = stableSidebarData
      .map((group) => {
        // Filter items based on role
        const filteredItems = group.items.filter((item) => {
          // If no roles specified, show to everyone
          if (!item.roles || item.roles.length === 0) {
            return true;
          }
          // Otherwise check if user's role is in the allowed roles
          const hasAccess = item.roles.includes(effectiveRole);

          // DEBUG: Log item filtering for admin section - client only
          if (typeof window !== 'undefined' && group.title === 'Admin') {
            console.log(`DEBUG AppSidebar - Admin item "${item.title}" access:`, {
              hasAccess,
              itemRoles: item.roles,
              userRole: effectiveRole,
            });
          }

          return hasAccess;
        });

        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter((group) => group.items.length > 0); // Remove empty groups

    // DEBUG: Log filtered navigation results - client only
    if (typeof window !== 'undefined') {
      console.log('DEBUG AppSidebar - Filtered navigation result:', {
        totalGroups: result.length,
        groups: result.map((g) => g.title),
        hasAdminGroup: result.some((g) => g.title === 'Admin'),
      });
    }

    return result;
  }, [effectiveRole]);

  // Add a state to prevent visible content until hydration is complete
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Update hydration state after initial render
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Always ensure sidebar is visible, without unnecessary transitions
  // The skeleton fallback will handle the initial loading state now
  const sidebarClassName = "fixed left-0 top-0 z-30 sidebar-visible animate-in fade-in-50 duration-300";

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className={sidebarClassName}
      style={{
        '--sidebar-width': APP_SIDEBAR_WIDTH,
        '--sidebar-width-icon': APP_SIDEBAR_WIDTH_ICON,
      } as React.CSSProperties}
    >
      {!isCollapsed && (
        <SidebarHeader className="p-1.5 flex flex-col gap-2">
          <TeamSwitcher defaultCollapsed={!open} />
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
