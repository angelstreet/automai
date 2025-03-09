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
import { useAuth } from '@/hooks/useAuth';
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
  const { signOut } = useAuth();
  const { open } = useSidebar();
  const isCollapsed = !open;

  const handleSignOut = async () => {
    const formData = new FormData();
    signOut(formData);
  };

  return (
    <SidebarMenu className="w-full max-w-[180px] mx-auto">
      <SidebarMenuItem className="w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size={isCollapsed ? "sm" : "default"}
              className={cn(
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                isCollapsed ? "justify-center py-1" : "py-1.5 px-2 w-full max-w-[180px]"
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
                <div className="grid flex-1 text-left text-xs leading-tight ml-2 max-w-[120px]">
                  <span className="font-semibold truncate">{user.name}</span>
                </div>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
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
