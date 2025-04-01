'use client';

import { ChevronUp } from 'lucide-react';
import { Suspense } from 'react';

import { HeaderUserProfile } from '@/components/header';
import { Button } from '@/components/shadcn/button';
import { Separator } from '@/components/shadcn/separator';
import { RoleSwitcher } from '@/components/team/RoleSwitcher';
import { ThemeToggleStatic } from '@/components/theme/ThemeToggleStatic';
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

  // Function to toggle header (can be implemented later)
  const toggleHeader = () => {
    console.log('Toggle header visibility');
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        fixed ? 'fixed top-0 z-50' : '',
        className,
      )}
      style={
        isCollapsed
          ? {
              marginLeft: 'var(--sidebar-width-offset, 0)',
              width: 'calc(100% - var(--sidebar-width-offset, 0))',
            }
          : undefined
      }
    >
      <div className="flex h-14 items-center border-b">
        {/* Left section */}
        <div className="relative flex items-center h-full">
          <div className={cn('flex items-center ml-4')}>
            {/* This is where SidebarTrigger would go */}
            <Separator orientation="vertical" className="h-8 opacity-50 mx-2" />
          </div>
        </div>

        {/* Center section - can be used for tabs or other content */}
        <div className="flex-1" />

        {/* Right section */}
        <div className="flex items-center gap-2 px-4 h-full">
          <div className="flex-none w-36 mr-12">
            {user ? (
              <RoleSwitcher key={`role-switcher-${user.role || 'default'}`} user={user} />
            ) : (
              <div className="w-[180px] h-10 bg-muted animate-pulse rounded-md"></div>
            )}
          </div>
          <Separator orientation="vertical" className="h-8 opacity-30" />
          <div className="flex items-center">
            <ThemeToggleStatic />
          </div>
          <Separator orientation="vertical" className="h-8 opacity-30" />
          <Suspense fallback={<div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />}>
            <HeaderUserProfile user={user} activeTeam={activeTeam} />
          </Suspense>
          <Separator orientation="vertical" className="h-8 opacity-30" />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={toggleHeader}
            title="Hide Header"
          >
            <ChevronUp className="h-4 w-4" />
            <span className="sr-only">Hide Header</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
