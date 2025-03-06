'use client';

import { FontProvider } from '@/context/FontContext';
import { RoleProvider } from '@/context/RoleContext';
import { SearchProvider } from '@/context/SearchContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { UserProvider } from '@/context/UserContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <FontProvider>
        <UserProvider>
          <RoleProvider>
            <SidebarProvider>
              <SearchProvider>{children}</SearchProvider>
            </SidebarProvider>
          </RoleProvider>
        </UserProvider>
      </FontProvider>
    </ThemeProvider>
  );
}
