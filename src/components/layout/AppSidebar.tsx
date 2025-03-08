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
  const { currentRole } = useRole();

  if (!user) return null;

  // Filter out empty sections based on user role
  const filteredNavGroups = sidebarData.navGroups.filter((group) => {
    // Filter items in each group based on user role
    const accessibleItems = group.items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(currentRole);
    });

    // Only include groups that have at least one accessible item
    return accessibleItems.length > 0;
  });

  // Get user display name and email from user metadata
  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  const userEmail = user.email || '';
  const userAvatar = user.user_metadata?.avatar_url || undefined;

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {filteredNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: userName,
            email: userEmail,
            avatar: userAvatar,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
