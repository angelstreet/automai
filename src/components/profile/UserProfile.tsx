'use client';

import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import * as React from 'react';

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
import { useUser } from '@/context/UserContext';
import { signOut } from '@/app/actions/auth';

interface UserProfileProps {
  tenant?: string;
}

export function UserProfile({ tenant: propTenant }: UserProfileProps) {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const locale = params.locale as string || 'en';
  const [imageError, setImageError] = React.useState(false);
  
  // Use tenant from props if available, otherwise use from URL params as fallback
  const tenant = propTenant || (params.tenant as string) || 'trial';
  
  // Get user's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  // Simple name and avatar extraction
  const userName = user?.name || user?.email?.split('@')[0] || 'Guest';
  const avatarSrc = user?.user_metadata?.avatar_url || '/avatars/default.svg';
  
  const handleSignOut = async () => {
    try {
      // Use the server action directly
      const formData = new FormData();
      formData.append('locale', locale);
      const result = await signOut(formData);
      
      // Let the server action handle the redirect
      if (result.success && result.redirectUrl) {
        router.push(result.redirectUrl);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground"
        >
          <Avatar className="h-8 w-8 border border-border dark:border-gray-600 shadow-sm">
            <AvatarImage
              src={avatarSrc}
              alt={userName}
              onError={() => setImageError(true)}
            />
            <AvatarFallback className="bg-accent text-accent-foreground dark:bg-gray-700 dark:text-gray-200">
              {userName ? getInitials(userName) : <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            {user && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
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
