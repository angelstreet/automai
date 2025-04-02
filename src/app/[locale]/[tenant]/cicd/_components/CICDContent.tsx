'use client';

import { useCICD } from '@/hooks/useCICD';

import CICDDetailsClient from './client/CICDDetailsClient';

export default function CICDContent() {
  // Use hook instead of fetching data directly
  const { providers } = useCICD();

  return (
    <div className="w-full border-0 shadow-none">
      <CICDDetailsClient initialProviders={providers} />
    </div>
  );
}
