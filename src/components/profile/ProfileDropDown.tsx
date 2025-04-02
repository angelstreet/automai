'use client';

import { LogOut, Settings, User, UserCircle2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { useSidebar } from '@/hooks';
import { cn } from '@/lib/utils';
import { Team } from '@/types/context/teamContextType';
import { User as UserType } from '@/types/service/userServiceType';

interface ProfileDropDownProps {
  user?: UserType | null;
  activeTeam?: Team | null;
  compact?: boolean; // For sidebar usage
}

export function ProfileDropDown({
  user,
  activeTeam: _activeTeam = null,
  compact = false,
}: ProfileDropDownProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const tenant = (params.tenant as string) || user?.tenant_name || 'trial';

  // Add sidebar state detection (only affects compact mode)
  const { state, open } = useSidebar();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(state === 'collapsed');

  // Add a small delay when expanding to avoid flash of content during transition
  React.useEffect(() => {
    if (state === 'collapsed') {
      setIsSidebarCollapsed(true);
    } else {
      // When expanding, delay showing text content
      const timer = setTimeout(() => {
        setIsSidebarCollapsed(false);
      }, 200); // Slight delay when expanding
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Get user's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      // Redirect to login page
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error('Error during sign out:', error);
      router.push(`/${locale}/login`);
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            compact
              ? 'relative flex items-center justify-between rounded-md p-2 hover:bg-sidebar-accent/50'
              : 'relative h-10 w-10 rounded-full',
            compact && isSidebarCollapsed && 'justify-center w-full px-0',
          )}
          data-sidebar-profile="true"
        >
          {compact && !isSidebarCollapsed ? (
            // Expanded sidebar - show full profile
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url || undefined} alt={user.name || 'User'} />
                <AvatarFallback>
                  {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-xs font-medium truncate max-w-[100px]">{user.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  Role: {user.role || 'viewer'}
                </span>
              </div>
            </div>
          ) : (
            // Collapsed sidebar or header - show avatar only
            <Avatar className={cn(compact && isSidebarCollapsed ? 'h-8 w-8' : 'h-10 w-10')}>
              <AvatarImage src={user.avatar_url || undefined} alt={user.name || 'User'} />
              <AvatarFallback>
                {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/profile`)}>
          <UserCircle2 className="mr-2 h-4 w-4" />
          Profile
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/settings`)}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
          <LogOut className="mr-2 h-4 w-4 text-red-500" />
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
