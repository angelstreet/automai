'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { useParams } from 'next/navigation';

interface WorkspaceHeaderProps {
  className?: string;
  tenant: string;
}

export function WorkspaceHeader({ className, tenant }: WorkspaceHeaderProps) {
  const [currentRole, setCurrentRole] = React.useState<Role>('admin');
  const { logout, user } = useUser();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleSignOut = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Determine the auth provider
      const provider = user?.provider;
      
      if (provider) {
        // Handle OAuth provider-specific logout
        const providerToken = localStorage.getItem(`${provider}Token`);
        
        if (providerToken) {
          try {
            // Revoke provider access
            await fetch(`http://localhost:5001/api/auth/${provider}/revoke`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
          } catch (error) {
            console.error(`Failed to revoke ${provider} token:`, error);
          }
        }
      }

      // Clear all auth-related data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('googleToken');
      localStorage.removeItem('githubToken');
      localStorage.removeItem('authProvider');
      
      // Clear session cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Call the context logout function
      logout();
      
      // Redirect to login page
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error('Error during sign out:', error);
      // Even if there's an error, try to redirect to login
      router.push(`/${locale}/login`);
    }
  };

  return (
    <header className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}>
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