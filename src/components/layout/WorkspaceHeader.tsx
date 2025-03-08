'use client';

import { ChevronUp, Bell, Search } from 'lucide-react';
import * as React from 'react';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

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
  // If no user is provided, show a minimal header
  if (!user) {
    console.warn('WorkspaceHeader: No user data provided');
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Link href={`/${locale}/${tenant}/dashboard`} className="flex items-center space-x-2">
          <span className="text-xl font-bold">Automai</span>
        </Link>
      </div>
      
      <div className="hidden md:flex md:flex-1">
        <form className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className="w-full rounded-md border border-input bg-background pl-8 pr-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </form>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="rounded-full p-2 hover:bg-accent">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </button>
        
        <UserNav 
          user={user} 
          tenant={tenant} 
          locale={locale} 
        />
      </div>
    </header>
  );
}
