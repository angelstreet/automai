'use client';

import Cookies from 'js-cookie';
import { ChevronUp, Bell, Search } from 'lucide-react';
import * as React from 'react';
import { User } from '@supabase/supabase-js';

import { SidebarTrigger } from '@/components/sidebar';
import { UserProfile } from '@/components/profile/UserProfile';
import { Button } from '@/components/shadcn/button';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { Separator } from '@/components/shadcn/separator';
import { ThemeToggle } from '@/components/shadcn/theme-toggle';
import { useRole } from '@/context/RoleContext';
import { UserNav } from './UserNav';

interface WorkspaceHeaderProps {
  user: User | null;
  tenant: string;
  locale: string;
}

const HEADER_COOKIE_NAME = 'header:state';
const HEADER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function WorkspaceHeader({ user, tenant, locale }: WorkspaceHeaderProps) {
  const { role } = useRole();
  const [headerVisible, setHeaderVisible] = React.useState(
    Cookies.get(HEADER_COOKIE_NAME) !== 'hidden',
  );

  // If no user is provided, show a minimal header
  if (!user) {
    console.warn('WorkspaceHeader: No user data provided');
    return (
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex h-14 items-center px-4">
          <SidebarTrigger />
          <div className="flex-1" />
        </div>
      </header>
    );
  }

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
        <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex h-14 items-center">
            {/* Left section */}
            <div className="flex items-center px-4 h-full">
              <SidebarTrigger />
            </div>

            {/* Center section - can be used for tabs or other content */}
            <div className="flex-1" />

            {/* Right section */}
            <div className="flex items-center gap-2 px-4 h-full">
              <RoleSwitcher />
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search..."
                  className="w-full rounded-md border border-input bg-background pl-8 pr-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Separator orientation="vertical" className="h-6 opacity-10" />
              <button className="rounded-full p-2 hover:bg-accent">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </button>
              <Separator orientation="vertical" className="h-6 opacity-10" />
              <ThemeToggle />
              <Separator orientation="vertical" className="h-6 opacity-10" />
              <UserNav 
                user={user} 
                tenant={tenant} 
                locale={locale} 
              />
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
