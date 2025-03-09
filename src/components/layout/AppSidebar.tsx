'use client';

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

import { sidebarData } from './data/sidebarData';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { role } = useRole();

  if (!user) return null;

  // Filter out empty sections based on user role
  const filteredNavGroups = sidebarData.navGroups.filter((group) => {
    // Filter items in each group based on user role
    const accessibleItems = group.items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(role);
    });

    // Only include groups that have at least one accessible item
    return accessibleItems.length > 0;
  });

  // Get user avatar from metadata
  const avatarUrl = user.user_metadata && (user.user_metadata as any).avatar_url;

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader>
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
