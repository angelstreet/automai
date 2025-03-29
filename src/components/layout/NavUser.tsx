'use client';

import { User } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { useSidebar, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/sidebar';
import { useUser } from '@/context';
import { cn } from '@/lib/utils';
import { User as UserType } from '@/types/user';

interface NavUserProps {
  user: UserType;
}

export function NavUser({ user }: NavUserProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string;
  const { open } = useSidebar();
  const { signOut } = useUser();
  const isCollapsed = !open;

  // Use the actual user role for display
  const displayRole = user.role;

  // Get user's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const handleSignOut = async () => {
    try {
      // First sign out
      await signOut(locale);

      // Then redirect to login (making sure it's awaited properly)
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error('Error signing out:', error);
      // Ensure we still redirect in case of error
      router.push(`/${locale}/login`);
    }
  };

  return (
    <SidebarMenu className="w-full max-w-[200px] mx-auto">
      <SidebarMenuItem className="w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size={isCollapsed ? 'sm' : 'default'}
              className={cn(
                'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
                isCollapsed ? 'justify-center py-1' : 'py-1.5 px-2 w-full max-w-[150px]',
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar_url || undefined} alt={user.name || 'User'} />
                <AvatarFallback>{getInitials(user.name || 'U')}</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="grid flex-1 text-left text-xs leading-tight ml-2 max-w-[100px]">
                  <span className="font-semibold truncate">{user.name}</span>
                  <span className="text-[10px] opacity-70 truncate">Role: {displayRole}</span>
                </div>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-26">
            <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push(`/${locale}/${tenant}/profile`)}
              className="text-xs"
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/${locale}/${tenant}/settings`)}
              className="text-xs"
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-xs">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
