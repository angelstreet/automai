'use client';

import * as React from 'react';

import { ProfileDropDown } from '@/components/profile/ProfileDropDown';
import { Sidebar } from '@/components/sidebar';
import { SidebarContent, SidebarFooter, SidebarHeader } from '@/components/sidebar/SidebarLayout';
import { SidebarNavigation } from '@/components/sidebar/SidebarNavigation';
import { SidebarRail } from '@/components/sidebar/SidebarRail';
import {
  APP_SIDEBAR_WIDTH,
  APP_SIDEBAR_WIDTH_ICON,
  sidebarNavigationData,
} from '@/components/sidebar/constants';
import { ActiveTeam } from '@/components/team/ActiveTeam';
import TeamSelector from '@/components/team/TeamSelector';
import { useSidebar } from '@/hooks';
import { cn } from '@/lib/utils';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

interface SidebarClientProps {
  user?: User | null;
  teams?: Team[];
  activeTeam?: Team | null;
}

// Wrap the component with React.memo to prevent unnecessary re-renders
const SidebarClient = React.memo(function SidebarClient({
  user,
  teams = [],
  activeTeam = null,
}: SidebarClientProps) {
  const sidebarContext = useSidebar('SidebarClient');
  const state = sidebarContext?.state || 'expanded';
  const open = sidebarContext?.open || true;

  // Track role changes with local state
  const [currentRole, setCurrentRole] = React.useState(user?.role || 'viewer');

  // Update local role state when user role changes
  React.useEffect(() => {
    if (user?.role) {
      setCurrentRole(user.role);
    }
  }, [user?.role]);

  // Listen for role changes from RoleSwitcher through the custom event
  React.useEffect(() => {
    const handleRoleChange = (event: CustomEvent) => {
      console.log('[SidebarClient] Detected role change:', event.detail.role);
      setCurrentRole(event.detail.role);
    };

    window.addEventListener('debug-role-change', handleRoleChange as EventListener);
    return () => {
      window.removeEventListener('debug-role-change', handleRoleChange as EventListener);
    };
  }, []);

  // Log debug information
  React.useEffect(() => {
    console.log('[@component:SidebarClient] Rendering with:', {
      user: user ? 'User data available' : 'No user data',
      teamsCount: teams.length,
      activeTeam: activeTeam?.name || 'No active team',
      open,
      state,
    });
  }, [user, teams, activeTeam, open, state]);

  // Extract navigation data from constants
  const navGroups = sidebarNavigationData.groups;
  const groupTitles = navGroups.map((group) => group.title);
  const items = navGroups.map((group) => group.items);

  // Update CSS variables when sidebar state changes
  React.useEffect(() => {
    // Simply set the offset based on the state - all calculations now in CSS
    document.documentElement.style.setProperty(
      '--sidebar-width-offset',
      state === 'collapsed' ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)',
    );

    // Set the sidebar state attribute for debugging and targeting
    document.documentElement.setAttribute('data-sidebar-state', state);
  }, [state]);

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="fixed left-0 top-0 z-30 sidebar-visible animate-in fade-in-50 duration-300"
      style={
        {
          '--sidebar-width': APP_SIDEBAR_WIDTH,
          '--sidebar-width-icon': APP_SIDEBAR_WIDTH_ICON, // Use correct variable names to match CSS selectors
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="p-1.5">
        <div className="sidebar-header-content flex flex-col gap-2">
          {/* Display the ActiveTeam component to show the current team */}
          <ActiveTeam defaultCollapsed={!open} user={user} teams={teams} activeTeam={activeTeam} />
          <TeamSelector user={user} teams={teams} activeTeam={activeTeam} />
        </div>
      </SidebarHeader>
      <SidebarContent className={cn('pt-2', !open && 'pt-4')}>
        <SidebarNavigation items={items} groupTitles={groupTitles} currentRole={currentRole} />
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
