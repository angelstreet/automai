'use client';

import { Suspense } from 'react';

import { UserProfile } from '@/components/profile/UserProfile';
import { ThemeToggleStatic } from '@/components/theme/ThemeToggleStatic';

interface WorkspaceHeaderProps {
  className?: string;
  fixed?: boolean;
}

export function WorkspaceHeader({ className = '', fixed = false }: WorkspaceHeaderProps) {
  return (
    <header
      className={`${className} ${fixed ? 'fixed' : ''} flex items-center justify-between p-4`}
    >
      <Suspense fallback={<div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />}>
        <ThemeToggleStatic />
      </Suspense>
      <Suspense fallback={<div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />}>
        <UserProfile />
      </Suspense>
    </header>
  );
}
