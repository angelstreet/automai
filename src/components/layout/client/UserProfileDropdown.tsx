'use client';

import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import * as React from 'react';
import { useState } from 'react';

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
import { useUser } from '@/context';
import { User } from '@/types/user';

interface UserProfileDropdownProps {
  user: User | null;
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const tenant = (params.tenant as string) || 'trial';
  const { signOut } = useUser();

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((part) => part?.[0] || '')
      .join('')
      .toUpperCase();
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Guest';
  const initials = getInitials(userName);
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url;

  console.log('UserProfileDropdown user:', user);
  console.log('Avatar URL:', avatarUrl);
  console.log('User metadata:', user?.user_metadata);
  console.log('User metadata avatar:', user?.user_metadata?.avatar_url);

  const handleSignOut = async () => {
    try {
      const result = await signOut(locale);
      if (result.success && result.redirectUrl) {
        router.push(result.redirectUrl);
      } else {
        router.push(`/${locale}/login`);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      router.push(`/${locale}/login`);
    }
  };

  React.useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background">
            {avatarUrl && !imageError ? (
              <Image
                src={avatarUrl}
                alt={userName}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
                onError={() => setImageError(true)}
              />
            ) : (
              <UserIcon className="h-5 w-5 text-foreground" />
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
