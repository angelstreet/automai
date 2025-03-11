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
import { useSidebar } from '@/hooks/useSidebar';

interface WorkspaceHeaderProps {
  className?: string;
  fixed?: boolean;
  tenant?: string;
}

const HEADER_COOKIE_NAME = 'header:state';
const HEADER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function WorkspaceHeader({ className = '', fixed = false, tenant }: WorkspaceHeaderProps) {
  const { open } = useSidebar();
  const isCollapsed = !open;
  const [headerVisible, setHeaderVisible] = React.useState(
    Cookies.get(HEADER_COOKIE_NAME) !== 'hidden',
  );

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
          className={`sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b ${className}`}
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
              <div className={cn('absolute', isCollapsed ? '-ml-16' : 'ml-1')}>
                <SidebarTrigger />
              </div>
            </div>

            {/* Center section - can be used for tabs or other content */}
            <div className="flex-1" />

            {/* Right section */}
            <div className="flex items-center gap-3 px-4 h-full">
              <div className="flex-none w-[160px]">
                <RoleSwitcher />
              </div>
              <div className="flex-1 max-w-[500px] min-w-[200px]">
                <Search />
              </div>
              <div className="flex items-center gap-4">
                <Separator orientation="vertical" className="h-8 opacity-10" />
                <ThemeToggle />
                <Separator orientation="vertical" className="h-8 opacity-10" />
                <UserProfile tenant={tenant} />
                <Separator orientation="vertical" className="h-8 opacity-10" />
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
