'use client';

import { useEffect, useMemo, useState } from 'react';
import { NavGroup } from '@/components/layout/NavGroup';
import { NavUser } from '@/components/layout/NavUser';
import { TeamSwitcher } from '@/components/layout/TeamSwitcher';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/sidebar';
import { useUser } from '@/context/UserContext';
import { Role } from '@/types/user';
import * as React from 'react';

import { sidebarData } from './data/sidebarData';

// Declare the global debug role for TypeScript
declare global {
  interface Window {
    __debugRole: Role | null;
  }
}

// Wrap the component with React.memo to prevent unnecessary re-renders
const AppSidebar = React.memo(function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const { open } = useSidebar();
  const isCollapsed = !open;

  // Add debug state for role override
  const [debugRole, setDebugRole] = useState<Role | null>(
    // Initialize from window.__debugRole if available
    typeof window !== 'undefined' ? window.__debugRole : null
  );

  // Listen for debug role change events
  useEffect(() => {
    const handleDebugRoleChange = (event: CustomEvent<{ role: Role }>) => {
      console.log('AppSidebar - Debug role change event received:', event.detail.role);
      setDebugRole(event.detail.role);
    };

    // Add event listener
    window.addEventListener('debug:roleChange', handleDebugRoleChange as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('debug:roleChange', handleDebugRoleChange as EventListener);
    };
  }, []);

  // Get the user role from debug override, user.user_role, or use a default role
  const userRole = debugRole || user?.user_role || 'viewer';
  
  // Log the current role being used for debugging
  useEffect(() => {
    console.log('AppSidebar - Current role being used:', userRole);
  }, [userRole]);

  // Filter out empty sections based on user role - memoize this calculation
  const filteredNavGroups = useMemo(() => {
    console.log('AppSidebar - Filtering nav groups for role:', userRole);
    
    // If no user, show nav items that an admin would see
    if (!user) {
      return sidebarData.navGroups.filter((group) => {
        // Show items accessible to admins
        const accessibleItems = group.items.filter((item) => {
          if (!item.roles) return true;
          // Show if admin has access
          return item.roles.includes('admin');
        });
        return accessibleItems.length > 0;
      });
    }
    
    // Existing logic for authenticated users
    return sidebarData.navGroups.filter((group) => {
      // Filter items in each group based on user role
      const accessibleItems = group.items.filter((item) => {
        if (!item.roles) return true;
        const hasAccess = item.roles.includes(userRole);
        return hasAccess;
      });

      // Only include groups that have at least one accessible item
      return accessibleItems.length > 0;
    });
  }, [user, userRole, sidebarData.navGroups]);

  // Get user avatar from metadata
  // Prepare user data for NavUser - memoize this calculation
  const userData = useMemo(() => {
    if (!user) return { name: 'Guest', email: '', avatar: undefined };
    
    // Simple and direct access to user properties
    return {
      name: user.name || user.email?.split('@')[0] || 'Guest',
      email: user.email || '',
      avatar: user.user_metadata?.avatar_url || '',
    };
  }, [user]);

  // Always render the sidebar with content, no more loading state for unauthenticated users
  // Updated version - March 9, 2025
  return (
    <Sidebar 
      collapsible="icon" 
      variant="floating" 
      className="fixed left-0 top-0 z-30"
      {...props}
    >
      {!isCollapsed && (
        <SidebarHeader className="p-1.5 flex flex-col gap-2">
          <TeamSwitcher />
        </SidebarHeader>
      )}
      <SidebarContent className={isCollapsed ? "pt-4" : "pt-2"}>
        {filteredNavGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="pb-2">
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});

// Export the memoized component
export { AppSidebar };
