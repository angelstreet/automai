'use client';

import Cookies from 'js-cookie';
import { ChevronUp } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

import { SidebarTrigger } from '@/components/sidebar';
import { UserProfile } from '@/components/profile/UserProfile';
import { Button } from '@/components/shadcn/button';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { Search } from '@/components/shadcn/search';
import { Separator } from '@/components/shadcn/separator';
import { ThemeToggle } from '@/components/shadcn/theme-toggle';
import { useSidebar } from '@/context/SidebarContext';
import { useUser } from '@/context';

interface WorkspaceHeaderProps {
  className?: string;
  fixed?: boolean;
  tenant?: string;
}

const HEADER_COOKIE_NAME = 'header:state';
const HEADER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function WorkspaceHeader({ className = '', fixed = false, tenant }: WorkspaceHeaderProps) {
  const { open } = useSidebar();
  const userContext = useUser();
  const isCollapsed = !open;
  const [headerVisible, setHeaderVisible] = React.useState(
    Cookies.get(HEADER_COOKIE_NAME) !== 'hidden',
  );
  
  // Debug log for user role
  React.useEffect(() => {
    if (userContext?.user) {
      console.log('[WorkspaceHeader] User data:', {
        id: userContext.user.id,
        role: userContext.user.role || 'No role found',
        tenant: userContext.user.tenant_name,
      });
    }
  }, [userContext?.user]);

  const toggleHeader = React.useCallback(() => {
    const newState = !headerVisible;
    setHeaderVisible(newState);
    Cookies.set(HEADER_COOKIE_NAME, newState ? 'visible' : 'hidden', {
      path: '/',
      expires: HEADER_COOKIE_MAX_AGE / (60 * 60 * 24), // Convert seconds to days
    });
  }, [headerVisible]);

  return (
    <>
      {headerVisible ? (
        <header
          className={`sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
          style={
            isCollapsed
              ? {
                  marginLeft: 'var(--sidebar-width-offset, 0)',
                  width: 'calc(100% - var(--sidebar-width-offset, 0))',
                }
              : undefined
          }
        >
          <div className="flex h-14 items-center">
            {/* Left section */}
            <div className="relative flex items-center h-full">
              <div className={cn('absolute flex items-center', isCollapsed ? '-ml-16' : 'ml-1')}>
                <SidebarTrigger />
                <Separator orientation="vertical" className="h-8 opacity-50 ml-2" />
              </div>
            </div>

            {/* Center section - can be used for tabs or other content */}
            <div className="flex-1" />
            <Separator orientation="vertical" className="h-8 opacity-50" />
            {/* Right section */}
            <div className="flex items-center gap-2 px-4 h-full">
              <div className="flex-none w-36 mr-12">
                <RoleSwitcher user={userContext?.user} />
              </div>
              <Separator orientation="vertical" className="h-8 opacity-30" />
              <div className="flex-1 max-w-[32rem] min-w-[12.5rem]">
                <Search />
              </div>
              <div className="flex items-center gap-1">
                <Separator orientation="vertical" className="h-8 opacity-30" />
                <ThemeToggle />
                <Separator orientation="vertical" className="h-8 opacity-30" />
                <UserProfile tenant={tenant} user={userContext?.user} />
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
          </div>
        </header>
      ) : (
        <div
          className="sticky top-0 z-50 flex justify-end px-4 py-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
          style={
            isCollapsed
              ? {
                  marginLeft: 'var(--sidebar-width-offset, 0)',
                  width: 'calc(100% - var(--sidebar-width-offset, 0))',
                }
              : undefined
          }
        >
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={toggleHeader}
            title="Show Header"
          >
            <ChevronUp className="h-4 w-4 rotate-180" />
            <span className="sr-only">Show Header</span>
          </Button>
        </div>
      )}
    </>
  );
}
