'use client';

import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { Suspense, useEffect } from 'react';

import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { ProfileDropDown } from '@/components/profile/ProfileDropDown';
import { Button } from '@/components/shadcn/button';
import { LanguageSwitcher } from '@/components/shadcn/language-switcher';
import { Separator } from '@/components/shadcn/separator';
import { SidebarTrigger } from '@/components/sidebar';
import { ThemeToggleStatic } from '@/components/theme';
import { Search } from '@/components/ui/Search';
import { WorkspaceSelector } from '@/components/workspace';
import { cn } from '@/lib/utils';
import { useHeaderStore } from '@/store/headerStore';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

import { HeaderEvents } from './HeaderEventListener';

interface HeaderClientProps {
  className?: string;
  fixed?: boolean;
  user?: User | null;
  activeTeam?: Team | null;
}

export function HeaderClient({
  className = '',
  fixed = false,
  user,
  activeTeam = null,
}: HeaderClientProps) {
  // Get header visibility state from Zustand store
  const { isVisible, toggleVisibility } = useHeaderStore();

  // Use provided team or fallback to context
  const currentTeam = activeTeam;

  // Function to toggle header visibility
  const handleToggleHeader = () => {
    console.log(`[@component:HeaderClient] Toggling header: ${isVisible ? 'hiding' : 'showing'}`);

    // Update state in Zustand store
    toggleVisibility();

    // Dispatch event for any listeners
    window.dispatchEvent(new Event(HeaderEvents.TOGGLE_HEADER_VISIBILITY));
  };

  // Log when visibility changes
  useEffect(() => {
    console.log(
      `[@component:HeaderClient] Header visibility changed to: ${isVisible ? 'expanded' : 'collapsed'}`,
    );
  }, [isVisible]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        fixed ? 'fixed top-0 z-50' : '',
        className,
      )}
      data-sidebar-header="true"
      data-header-state={isVisible ? 'expanded' : 'collapsed'}
    >
      <div
        className={cn('flex h-14 items-center relative')}
        data-header-state={isVisible ? 'expanded' : 'collapsed'}
      >
        {isVisible && (
          <>
            {/* Left section */}
            <div className="relative flex items-center h-full">
              <div className="sidebar-trigger-container">
                <SidebarTrigger />
                <Separator orientation="vertical" className="h-8 opacity-50 ml-2" />
              </div>
            </div>

            {/* Center section - Display tenant name */}
            <div className="flex items-center justify-start mx-6 min-w-[16rem]">
              {currentTeam?.tenant_name && (
                <div className="text-lg font-semibold ml-4 flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  {currentTeam.tenant_name}
                </div>
              )}
            </div>

            {/* Right section */}
            <div className="flex-1 flex items-center justify-end gap-2 px-2 h-full pr-14">
              {/* Role Switcher */}
              <div className="flex-none w-32">
                {user ? (
                  <RoleSwitcher
                    key={`role-switcher-${user.role || 'default'}`}
                    user={user}
                    instanceId="header"
                  />
                ) : (
                  <div className="w-[150px] h-10 bg-muted animate-pulse rounded-md"></div>
                )}
              </div>

              <Separator orientation="vertical" className="h-8 opacity-30" />

              {/* Workspace Selector */}
              <div className="flex-none w-52">
                <WorkspaceSelector />
              </div>

              <Separator orientation="vertical" className="h-8 opacity-30" />

              {/* Search Bar - Flexible width */}
              <div className="flex-1 max-w-[24rem] min-w-[10rem]">
                <Search />
              </div>

              {/* Utilities section - fixed width */}
              <div className="flex items-center gap-1 flex-none">
                <Separator orientation="vertical" className="h-8 opacity-30" />
                <LanguageSwitcher />
                <Separator orientation="vertical" className="h-8 opacity-30" />
                <ThemeToggleStatic />
                <Separator orientation="vertical" className="h-8 opacity-30" />
                <Suspense
                  fallback={<div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />}
                >
                  <ProfileDropDown user={user} activeTeam={currentTeam} />
                </Suspense>
              </div>
            </div>
          </>
        )}

        {/* Always show toggle button at the end - positioned absolutely */}
        <div className="absolute right-4 flex items-center h-full">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleToggleHeader}
            title={isVisible ? 'Hide Header' : 'Show Header'}
          >
            {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="sr-only">{isVisible ? 'Hide Header' : 'Show Header'}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
