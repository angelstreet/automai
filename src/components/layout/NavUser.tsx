'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { signOut } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

interface NavUserProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function NavUser({ user }: NavUserProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string;
  const { open } = useSidebar();
  const isCollapsed = !open;

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
    <SidebarMenu className="w-full max-w-[200px] mx-auto">
      <SidebarMenuItem className="w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size={isCollapsed ? "sm" : "default"}
              className={cn(
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                isCollapsed ? "justify-center py-1" : "py-1.5 px-2 w-full max-w-[150px]"
              )}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <User className="h-3 w-3 text-foreground" />
                )}
              </div>
              {!isCollapsed && (
                <div className="grid flex-1 text-left text-xs leading-tight ml-2 max-w-[100px]">
                  <span className="font-semibold truncate">{user.name}</span>
                </div>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-26">
            <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/profile`)} className="text-xs">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/settings`)} className="text-xs">
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
