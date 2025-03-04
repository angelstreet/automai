'use client';

import { useSession } from 'next-auth/react';
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

import { sidebarData } from './data/sidebarData';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const { currentRole } = useRole();

  if (!session?.user) return null;

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
            name: session.user.name || 'User',
            email: session.user.email || '',
            avatar: session.user.image || undefined,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
