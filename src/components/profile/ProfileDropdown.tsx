import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
import { useUser } from '@/context/UserContext';
import supabaseAuth from '@/lib/supabase-auth';

type UserData = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function ProfileDropdown() {
  const { user, logout } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    async function getUserData() {
      const { data } = await supabaseAuth.getUser();
      if (data?.user) {
        setUserData({
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email,
          image: data.user.user_metadata?.avatar_url || '/avatars/01.svg'
        });
      }
    }
    
    getUserData();
  }, []);

  // Get user's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
    router.push(`/${locale}/login`);
  };

  if (!userData) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={userData.image || '/avatars/01.svg'}
              alt={userData.name || 'User'}
            />
            <AvatarFallback>{getInitials(userData.name || 'U')}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{userData.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push(`/${locale}/${params.tenant}/settings/profile`)}
          >
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/${locale}/${params.tenant}/settings/billing`)}
          >
            Billing
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/${locale}/${params.tenant}/settings`)}>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/${locale}/${params.tenant}/settings/team`)}
          >
            New Team
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
