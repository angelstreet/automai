'use client';

import { ReactNode } from 'react';

import { PermissionProvider } from './permission';
import { SidebarProvider } from './sidebar';
import { SWRProvider } from './swr';
import { TeamProvider } from './team';
import { ThemeProviders } from './theme';
import { ToastProvider } from './toast';
import { UserProvider } from './user';

interface ProvidersProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  defaultSidebarOpen?: boolean;
  initialUser?: any;
}

export function Providers({
  children,
  defaultTheme = 'system',
  defaultSidebarOpen = true,
  initialUser = null,
}: ProvidersProps) {
  return (
    <ThemeProviders defaultTheme={defaultTheme}>
      <SWRProvider>
        <UserProvider initialUser={initialUser}>
          <TeamProvider>
            <PermissionProvider>
              <SidebarProvider defaultOpen={defaultSidebarOpen}>
                <ToastProvider>{children}</ToastProvider>
              </SidebarProvider>
            </PermissionProvider>
          </TeamProvider>
        </UserProvider>
      </SWRProvider>
    </ThemeProviders>
  );
}

export { PermissionProvider, usePermissionContext } from './permission';
export { SidebarProvider, useSidebar } from './sidebar';
export { SWRProvider } from './swr';
export { TeamProvider, useTeam } from './team';
export { ThemeProviders, useTheme } from './theme';
export { ToastProvider } from './toast';
export { UserProvider, useUser } from './user';
