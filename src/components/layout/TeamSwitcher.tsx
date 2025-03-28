import { Suspense } from 'react';
import TeamSwitcherClient from './client/TeamSwitcherClient';
import { Building2 } from 'lucide-react';
import type { Team } from '@/types/context/team';

interface TeamSwitcherProps {
  defaultCollapsed?: boolean;
  teams?: Team[];
}

export function TeamSwitcher({ defaultCollapsed = false }: TeamSwitcherProps) {
  // Server-side component that wraps the client component with suspense
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
            <Building2 className="h-4 w-4" />
          </div>
        </div>
      }
    >
      <TeamSwitcherClient defaultCollapsed={defaultCollapsed} />
    </Suspense>
  );
}
