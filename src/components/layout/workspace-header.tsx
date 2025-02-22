'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { RoleSwitcher, type Role } from '@/components/ui/role-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { signOut } from 'next-auth/react';

interface WorkspaceHeaderProps {
  className?: string;
  tenant?: string;
}

export function WorkspaceHeader({ className, tenant }: WorkspaceHeaderProps) {
  const [currentRole, setCurrentRole] = React.useState<Role>('admin');
  const { logout, user } = useUser();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleSignOut = async () => {
    try {
      // Call Next-Auth signOut
      await signOut({ redirect: false });
      
      // Call the context logout function
      logout();
      
      // Redirect to login page
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error('Error during sign out:', error);
      router.push(`/${locale}/login`);
    }
  };

  return (
    <header className={`sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}>
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-semibold">{tenant}</span>
        </div>
        <div className="flex items-center gap-4">
          <RoleSwitcher currentRole={currentRole} onRoleChange={setCurrentRole} />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/profile`)}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/settings`)}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
} 