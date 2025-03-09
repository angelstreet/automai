'use client';

import { ChevronDown, Code2, Building2, Factory } from 'lucide-react';
import * as React from 'react';

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/context/RoleContext';
import { useUserRoles } from '@/hooks/useUserRoles';

export function RoleSwitcher() {
  const { user } = useAuth();
  const { role, setRole } = useRole();
  const { roles, isLoading } = useUserRoles();
  const { isOpen } = useSidebar();

  if (!user || isLoading || roles.length === 0) {
    return null;
  }

  const currentRole = roles.find(r => r.id === role);

  return !isOpen ? (
    <SidebarMenu>
      <SidebarMenuButton>
        {currentRole?.icon || <Code2 className="h-4 w-4" />}
      </SidebarMenuButton>
      {roles.map((item) => (
        <SidebarMenuItem
          key={item.id}
          onClick={() => setRole(item.id as 'admin' | 'user' | 'developer' | 'operator')}
          className={item.id === role ? "bg-accent" : ""}
        >
          {item.icon || <Code2 className="h-4 w-4" />}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
          <div className="flex items-center gap-3">
            {currentRole?.icon || <Code2 className="h-4 w-4" />}
            <span className="text-sm font-medium">{currentRole?.name || 'Developer'}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="right" forceMount>
        <DropdownMenuLabel>Switch role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => setRole(item.id as 'admin' | 'user' | 'developer' | 'operator')}
          >
            {item.icon || <Code2 className="mr-2 h-4 w-4" />}
            <span>{item.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
