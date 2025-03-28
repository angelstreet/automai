'use client';

import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import * as React from 'react';

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
import { signOut } from '@/app/actions/auth';
import { User } from '@/types/user';

interface UserProfileDropdownProps {
  user: User | null;
  clearCache?: () => Promise<void>;
}

export function UserProfileDropdown({ user, clearCache }: UserProfileDropdownProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const tenant = (params.tenant as string) || 'trial';

  // Get user's initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((part) => part?.[0] || '')
      .join('')
      .toUpperCase();
  };

  // Extract user information with null safety
  const userName = user?.name || user?.email?.split('@')[0] || 'Guest';
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url;
  const initials = getInitials(userName);

  const handleSignOut = async () => {
    try {
      // Try to clear cache, but don't block the logout process if it fails
      if (clearCache) {
        try {
          await clearCache();
        } catch (cacheError) {
          console.warn('Error clearing cache during logout:', cacheError);
        }
      }

      // Then sign out
      const formData = new FormData();
      formData.append('locale', locale);
      const result = await signOut(formData);

      // Try to clear localStorage manually as a backup
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_user_time');
        }
      } catch (e) {
        // Ignore localStorage errors
      }

      // Let the server action handle the redirect
      if (result.success && result.redirectUrl) {
        router.push(result.redirectUrl);
      } else {
        // Fallback redirect if server action doesn't provide a URL
        router.push(`/${locale}/login`);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Attempt to redirect to login even if there's an error
      router.push(`/${locale}/login`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground"
        >
          <div className="h-8 w-8 rounded-full border border-border dark:border-gray-600 shadow-sm overflow-hidden flex items-center justify-center bg-accent text-accent-foreground dark:bg-gray-700 dark:text-gray-200">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={userName}
                width={32}
                height={32}
                priority
                className="h-8 w-8 rounded-full"
              />
            ) : (
              initials || <UserIcon className="h-4 w-4" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email || ''}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/profile`)}>
          <UserIcon className="mr-2 h-4 w-4" />
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
          onClick={handleSignOut}
          className="text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}