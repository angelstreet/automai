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
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/user';
import * as React from 'react';

import { sidebarData } from './data/sidebarData';

// Wrap the component with React.memo to prevent unnecessary re-renders
const AppSidebar = React.memo(function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { role } = useRole();
  const { open } = useSidebar();
  const isCollapsed = !open;

  // Always call useMemo hooks in the same order, regardless of conditions
  // Create empty/default values for the memoized data when user is not available
  const userRole = role as Role;
  
  // Filter out empty sections based on user role - memoize this calculation
  const filteredNavGroups = useMemo(() => {
    if (!user) return [];
    
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
  const avatarUrl = user?.user_metadata && (user.user_metadata as any).avatar_url;

  // Prepare user data for NavUser - memoize this calculation
  const userData = useMemo(() => {
    if (!user) return { name: 'User', email: '', avatar: undefined };
    
    return {
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      avatar: avatarUrl,
    };
  }, [user, avatarUrl]);

  // If user is not loaded yet, return a loading state
  if (!user) {
    return (
      <Sidebar 
        collapsible="icon" 
        variant="floating"
        className="fixed left-0 top-0 z-30"
        {...props}
      >
        <SidebarHeader className="p-2">
          <div className="h-12 w-full animate-pulse bg-accent/20 rounded-lg"></div>
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-4 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-full animate-pulse bg-accent/20 rounded-lg"></div>
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="h-12 w-full animate-pulse bg-accent/20 rounded-lg m-2"></div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }

  return (
    <Sidebar 
      collapsible="icon" 
      variant="floating" 
      className="fixed left-0 top-0 z-30"
      {...props}
    >
      {!isCollapsed && (
        <SidebarHeader className="p-1.5">
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
