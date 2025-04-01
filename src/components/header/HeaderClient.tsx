'use client';

import { Suspense } from 'react';

import { HeaderUserProfile } from '@/components/header';
import { ThemeToggleStatic } from '@/components/theme/ThemeToggleStatic';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

interface HeaderClientProps {
  className?: string;
  fixed?: boolean;
  user?: User | null;
  activeTeam?: Team | null;
}

export function HeaderClient({
  className = '',
  fixed = false,
  user,
  activeTeam = null,
}: HeaderClientProps) {
  return (
    <header
      className={`${className} ${fixed ? 'fixed' : ''} flex items-center justify-between p-4`}
    >
      <Suspense fallback={<div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />}>
        <ThemeToggleStatic />
      </Suspense>
      <Suspense fallback={<div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />}>
        <HeaderUserProfile user={user} activeTeam={activeTeam} />
      </Suspense>
    </header>
  );
}
