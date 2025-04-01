import { User } from 'lucide-react';
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
import { useUser } from '@/context';

interface UserProfileProps {
  tenant?: string;
}

export function UserProfile({ tenant }: UserProfileProps) {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const locale = (params?.locale as string) || 'en';

  const handleSignOut = async () => {
    try {
      // Use formData to pass the locale
      const formData = new FormData();
      formData.append('locale', locale);
      
      // Redirect to login page
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error('Error during sign out:', error);
      router.push(`/${locale}/login`);
    }
  };

  // Get user's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image || '/avatars/01.svg'} alt={user?.name || 'User'} />
            <AvatarFallback>
              {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/profile`)}>
          Profile
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/settings`)}>
          Settings
          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
