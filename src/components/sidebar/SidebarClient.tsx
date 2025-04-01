'use client';

import * as React from 'react';

import { ProfileDropDown } from '@/components/profile/ProfileDropDown';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/sidebar';
import { SidebarNavGroup } from '@/components/sidebar/SidebarNavGroup';
import { APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_ICON } from '@/components/sidebar/constants';
import { sidebarData } from '@/components/sidebar/sidebarData';
import TeamSelector from '@/components/team/TeamSelector';
import { TeamSwitcher } from '@/components/team/TeamSwitcher';
import { useSidebar } from '@/hooks';
import { cn } from '@/lib/utils';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

interface SidebarClientProps {
  user?: User | null;
  teams?: Team[];
  activeTeam?: Team | null;
  setSelectedTeam?: (teamId: string) => Promise<void>;
}

// Wrap the component with React.memo to prevent unnecessary re-renders
const SidebarClient = React.memo(function SidebarClient({
  user,
  teams = [],
  activeTeam = null,
  setSelectedTeam,
}: SidebarClientProps) {
  const { open } = useSidebar();

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

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="fixed left-0 top-0 z-30 sidebar-visible animate-in fade-in-50 duration-300"
      style={
        {
          '--sidebar-width': APP_SIDEBAR_WIDTH,
          '--sidebar-width-icon': APP_SIDEBAR_WIDTH_ICON,
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="p-1.5">
        <div className="sidebar-header-content flex flex-col gap-2">
          <TeamSwitcher
            defaultCollapsed={!open}
            user={user}
            teams={teams}
            activeTeam={activeTeam}
            setSelectedTeam={setSelectedTeam}
          />
          <TeamSelector
            user={user}
            teams={teams}
            activeTeam={activeTeam}
            setSelectedTeam={setSelectedTeam}
          />
        </div>
      </SidebarHeader>
      <SidebarContent className={cn('pt-2', !open && 'pt-4')}>
        {filteredNavigation.map((group) => (
          <SidebarNavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="pb-2">
        {user && (
          <div className="w-full p-2">
            <ProfileDropDown user={user} activeTeam={activeTeam} compact={true} />
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});

export { SidebarClient };
