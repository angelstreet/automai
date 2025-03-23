'use client';

import { Fragment } from 'react';
import { useUser } from '@/context/UserContext';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';

export function ProfileDropdown() {
  const { user, signOut } = useUser();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string;
  const t = useTranslations();

  // Create a wrapper function for signOut
  const handleSignOut = () => {
    const formData = new FormData();
    formData.append('locale', locale);
    signOut(formData);
  };

  if (!user) return null;

  // Get user avatar from user_metadata if available
  const userImage = user.user_metadata?.avatar_url || '/avatars/01.svg';

  // Get user display name
  // All metadata fields are already extracted to the top-level user object in auth.ts
  const userName =
    // Name directly on user object (extracted from metadata by auth service)
    user.name ||
    // Fall back to email username
    user.email?.split('@')[0] ||
    // Final fallback
    'Guest';

  // Get user initials for avatar fallback
  const userInitials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/profile`)}>
            <User className="mr-2 h-4 w-4" />
            <span>{t('Profile.profile')}</span>
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/settings`)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>{t('Settings.title')}</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('Auth.signOut')}</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
