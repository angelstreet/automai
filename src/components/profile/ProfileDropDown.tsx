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
import { useSidebar, useAuth } from '@/hooks';
import { cn } from '@/lib/utils';
import { SidebarContext } from '@/types/context/sidebarContextType';
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
  const sidebarContext = useSidebar('ProfileDropDown');
  const sidebarState = (sidebarContext as SidebarContext)?.state;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(sidebarState === 'collapsed');

  // Cache avatar URL to prevent unnecessary reloads
  const [cachedAvatarUrl, setCachedAvatarUrl] = React.useState<string | undefined>(undefined);

  // Initialize and update cached avatar URL
  React.useEffect(() => {
    if (user?.avatar_url && user.avatar_url !== cachedAvatarUrl) {
      // Store in state for component use
      setCachedAvatarUrl(user.avatar_url);

      // Also cache in localStorage for persistence
      try {
        localStorage.setItem(`avatar_${user.id}`, user.avatar_url);
      } catch {
        console.warn('Failed to cache avatar URL in localStorage');
      }
    } else if (!cachedAvatarUrl && user?.id) {
      // Try to load from localStorage on initial mount
      try {
        const storedAvatar = localStorage.getItem(`avatar_${user.id}`);
        if (storedAvatar) {
          setCachedAvatarUrl(storedAvatar);
        } else if (user.avatar_url) {
          setCachedAvatarUrl(user.avatar_url);
        }
      } catch {
        // Fallback to user.avatar_url if localStorage fails
        if (user.avatar_url) {
          setCachedAvatarUrl(user.avatar_url);
        }
      }
    }
  }, [user?.id, user?.avatar_url, cachedAvatarUrl]);

  // Add a small delay when expanding to avoid flash of content during transition
  React.useEffect(() => {
    if (sidebarState === 'collapsed') {
      setIsSidebarCollapsed(true);
    } else {
      // When expanding, delay showing text content
      const timer = setTimeout(() => {
        setIsSidebarCollapsed(false);
      }, 200); // Slight delay when expanding
      return () => clearTimeout(timer);
    }
  }, [sidebarState]);

  // Get user's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  // Use the auth hook for logout functionality
  const { logout, isLoggingOut } = useAuth('ProfileDropDown');

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
                <AvatarImage
                  src={cachedAvatarUrl || undefined}
                  alt={user.name || 'User'}
                  crossOrigin="anonymous"
                />
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
              <AvatarImage
                src={cachedAvatarUrl || undefined}
                alt={user.name || 'User'}
                crossOrigin="anonymous"
              />
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
        <DropdownMenuItem
          onClick={() => logout()}
          disabled={isLoggingOut}
          className="text-red-500 focus:text-red-500"
        >
          <LogOut className="mr-2 h-4 w-4 text-red-500" />
          {isLoggingOut ? 'Logging out...' : 'Log out'}
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
