'use client';

import { User } from '@supabase/supabase-js';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';

interface UserNavProps {
  user: User | null;
  tenant: string;
  locale: string;
}

export function UserNav({ user, tenant, locale }: UserNavProps) {
  const t = useTranslations();
  const { signOut } = useAuth();

  if (!user) return null;

  // Create a wrapper function for signOut
  const handleSignOut = () => {
    const formData = new FormData();
    signOut(formData);
  };

  // Get user avatar image
  const userImage = user.user_metadata?.avatar_url || '/avatars/01.svg';
  // Get user display name
  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  // Get user initials for avatar fallback
  const userInitials = userName
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg p-4 hover:bg-accent">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={userImage} alt={userName} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="right" forceMount>
        <DropdownMenuLabel>{t('Profile.title')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/${tenant}/profile`}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>{t('Profile.profile')}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/${tenant}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t('Settings.title')}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('Auth.signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 