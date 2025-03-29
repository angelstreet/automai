import { Building2 } from 'lucide-react';
import { Suspense } from 'react';

import type { Team } from '@/types/context/team';
import type { User } from '@/types/user';

import TeamSwitcherClient from '@/components/team/TeamSwitcherClient';

interface TeamSwitcherProps {
  defaultCollapsed?: boolean;
  teams?: Team[];
  user?: User | null;
}

export function TeamSwitcher({ defaultCollapsed = false, user }: TeamSwitcherProps) {
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
      <TeamSwitcherClient defaultCollapsed={defaultCollapsed} initialUser={user} />
    </Suspense>
  );
}
