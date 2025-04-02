'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Suspense, useState, useEffect } from 'react';

import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { ProfileDropDown } from '@/components/profile/ProfileDropDown';
import { Button } from '@/components/shadcn/button';
import { Separator } from '@/components/shadcn/separator';
import { SidebarTrigger } from '@/components/sidebar';
import { ThemeToggleStatic } from '@/components/theme/ThemeToggleStatic';
import { Search } from '@/components/ui/Search';
import { useSidebar } from '@/hooks';
import { cn } from '@/lib/utils';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

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
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [headerVisible, setHeaderVisible] = useState(true);

  // Function to toggle header visibility
  const toggleHeader = () => {
    setHeaderVisible(!headerVisible);
    console.log(`Header is now ${!headerVisible ? 'visible' : 'hidden'}`);
  };
  
  // Update document with header state for global CSS targeting
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-header-state', 
      headerVisible ? 'expanded' : 'collapsed'
    );
  }, [headerVisible]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        fixed ? 'fixed top-0 z-50' : '',
        className,
      )}
      data-sidebar-header="true"
    >
      <div 
        className={cn('flex h-14 items-center relative')}
        data-header-state={headerVisible ? 'expanded' : 'collapsed'}>
        {headerVisible && (
          <>
            {/* Left section */}
            <div className="relative flex items-center h-full">
              <div className="sidebar-trigger-container">
                <SidebarTrigger />
                <Separator orientation="vertical" className="h-8 opacity-50 ml-2" />
              </div>
            </div>

            {/* Center section - can be used for tabs or other content */}
            <div className="flex-1" />

            {/* Right section */}
            <div className="flex items-center gap-4 px-4 h-full pr-14">
              <div className="flex-none w-36 mr-4">
                {user ? (
                  <RoleSwitcher key={`role-switcher-${user.role || 'default'}`} user={user} />
                ) : (
                  <div className="w-[180px] h-10 bg-muted animate-pulse rounded-md"></div>
                )}
              </div>
              <Separator orientation="vertical" className="h-8 opacity-30" />
              <div className="flex-1 max-w-[32rem] min-w-[12.5rem]">
                <Search />
              </div>
              <div className="flex items-center gap-1">
                <Separator orientation="vertical" className="h-8 opacity-30" />
                <ThemeToggleStatic />
                <Separator orientation="vertical" className="h-8 opacity-30" />
                <Suspense
                  fallback={<div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />}
                >
                  <ProfileDropDown user={user} activeTeam={activeTeam} />
                </Suspense>
                <Separator orientation="vertical" className="h-8 opacity-30" />
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
            onClick={toggleHeader}
            title={headerVisible ? 'Hide Header' : 'Show Header'}
          >
            {headerVisible ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="sr-only">{headerVisible ? 'Hide Header' : 'Show Header'}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
