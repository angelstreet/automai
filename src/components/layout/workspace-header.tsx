'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { RoleSwitcher, type Role } from '@/components/ui/role-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserProfile } from '@/components/ui/user-profile';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Search } from '@/components/ui/search';

interface WorkspaceHeaderProps {
  className?: string;
  fixed?: boolean;
}

export function WorkspaceHeader({ className = '', fixed = false }: WorkspaceHeaderProps) {
  const [currentRole, setCurrentRole] = React.useState<Role>('viewer');
  const params = useParams();
  const tenant = params.tenant as string;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
        </div>
      </div>
    </header>
  );
} 