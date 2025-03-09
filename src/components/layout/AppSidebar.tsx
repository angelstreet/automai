'use client';

import { useEffect } from 'react';
import { NavGroup } from '@/components/layout/NavGroup';
import { NavUser } from '@/components/layout/NavUser';
import { TeamSwitcher } from '@/components/layout/TeamSwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/sidebar';
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/user';

import { sidebarData } from './data/sidebarData';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { role } = useRole();

  // Add debugging to help identify issues
  useEffect(() => {
    console.log('AppSidebar - Current user:', user);
    console.log('AppSidebar - Current role:', role);
  }, [user, role]);

  // If user is not loaded yet, return a loading state
  if (!user) {
    console.log('AppSidebar - User not loaded yet, showing loading state');
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

  // Ensure role is a valid Role type
  const userRole = role as Role;
  console.log('AppSidebar - Using role:', userRole);

  // Filter out empty sections based on user role
  const filteredNavGroups = sidebarData.navGroups.filter((group) => {
    // Filter items in each group based on user role
    const accessibleItems = group.items.filter((item) => {
      if (!item.roles) return true;
      const hasAccess = item.roles.includes(userRole);
      console.log(`AppSidebar - Item "${item.title}" access:`, hasAccess, 'for role:', userRole);
      return hasAccess;
    });

    // Only include groups that have at least one accessible item
    return accessibleItems.length > 0;
  });

  console.log('AppSidebar - Filtered nav groups:', filteredNavGroups.map(g => g.title));

  // Get user avatar from metadata
  const avatarUrl = user.user_metadata && (user.user_metadata as any).avatar_url;

  return (
    <Sidebar 
      collapsible="icon" 
      variant="floating" 
      className="fixed left-0 top-0 z-30"
      {...props}
    >
      <SidebarHeader className="p-2">
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {filteredNavGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar: avatarUrl,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
