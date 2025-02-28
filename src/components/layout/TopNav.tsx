'use client';

import * as React from 'react';

import { TeamSwitcher } from '@/components/Layout/TeamSwitcher';

import { sidebarData } from '@/data/sidebar-data';

export function TopNav() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <TeamSwitcher teams={sidebarData.teams} />
      <div className="flex flex-1" />
    </div>
  );
}
