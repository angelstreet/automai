'use client';

import { ReactNode } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

import { Team } from '@/app/actions/team';
import { TeamProvider } from '@/context/TeamContext';
import { UserProvider } from '@/context/UserContext';
import { User } from '@/types/auth/user';

// Create a client - moved here from server component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

// This client component wraps the layout and provides client-side context providers
export default function TenantLayoutClient({
  children,
  user,
  teams,
  activeTeam,
}: {
  children: ReactNode;
  user: User | null;
  teams: Team[];
  activeTeam: Team | null;
}) {
  console.log('[TenantLayoutClient] Rendering with teams:', teams.length);
  console.log('[TenantLayoutClient] Active team ID:', activeTeam?.id || 'none');

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider initialUser={user}>
        <TeamProvider initialTeams={teams} initialActiveTeam={activeTeam}>
          <div className="relative flex w-full overflow-hidden">{children}</div>
        </TeamProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
