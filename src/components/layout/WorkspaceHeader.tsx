'use client';

import Cookies from 'js-cookie';
import { ChevronUp } from 'lucide-react';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/Shadcn/button';
import { RoleSwitcher } from '@/components/Shadcn/role-switcher';
import { Search } from '@/components/Shadcn/search';
import { Separator } from '@/components/Shadcn/separator';
import { ThemeToggle } from '@/components/Shadcn/theme-toggle';
import { UserProfile } from '@/components/Shadcn/user-profile';
import { SidebarTrigger } from '@/components/Sidebar';
import { SidebarMenuButton } from '@/components/Sidebar/SidebarMenuButton';
import { useRole } from '@/context/RoleContext';

interface WorkspaceHeaderProps {
  className?: string;
  fixed?: boolean;
  tenant?: string;
}

const HEADER_COOKIE_NAME = 'header:state';
const HEADER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function WorkspaceHeader({ className = '', fixed = false, tenant }: WorkspaceHeaderProps) {
  const { currentRole, setCurrentRole } = useRole();
  const params = useParams();
  const locale = params.locale as string;
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
        <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center">
            {/* Left section */}
            <div className="flex items-center px-4 h-full">
              <SidebarTrigger />
            </div>

            {/* Center section - can be used for tabs or other content */}
            <div className="flex-1" />

            {/* Right section */}
            <div className="flex items-center gap-2 px-4 h-full">
              <RoleSwitcher currentRole={currentRole} onRoleChange={setCurrentRole} />
              <Search className="w-[240px]" />
              <Separator orientation="vertical" className="h-6 opacity-10" />
              <ThemeToggle />
              <Separator orientation="vertical" className="h-6 opacity-10" />
              <UserProfile tenant={tenant} />
              <Separator orientation="vertical" className="h-6 opacity-10" />
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
      ) : (
        <div className="sticky top-0 z-50 flex justify-end px-4 py-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
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
