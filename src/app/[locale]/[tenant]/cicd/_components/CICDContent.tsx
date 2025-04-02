'use client';

import CICDDetailsClient from './client/CICDDetailsClient';
import { useCICD } from './providers';

export default function CICDContent() {
  // Use hook instead of fetching data directly
  const { providers } = useCICD('CICDContent');

  return (
    <div className="w-full border-0 shadow-none">
      <CICDDetailsClient initialProviders={providers} />
    </div>
  );
}
