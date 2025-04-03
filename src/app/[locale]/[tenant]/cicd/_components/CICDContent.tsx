'use client';

import { useCICD } from '../_components/client/CICDProvider';

import CICDDetailsClient from './client/CICDDetailsClient';

// This component uses the event-based refresh system similar to Hosts feature
// The CICDProvider context listens for refresh events and updates the providers list
export default function CICDContent() {
  // Use the context provider hook
  const { providers, isLoading } = useCICD('CICDContent');

  return (
    <div className="w-full border-0 shadow-none">
      <CICDDetailsClient initialProviders={providers} isLoading={isLoading} />
    </div>
  );
}
