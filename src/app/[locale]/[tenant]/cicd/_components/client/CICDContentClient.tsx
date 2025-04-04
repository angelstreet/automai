'use client';

import { useCICD } from '@/hooks/useCICD';

import CICDTableClient from './CICDTableClient';

/**
 * Main CICD content component
 *
 * Following architectural pattern:
 * - Marked as client component with 'use client' directive
 * - Imports hook directly from @/hooks/useCICD
 * - No direct context usage
 * - Uses hook for data and business logic
 */
export default function CICDContentClient() {
  // Use the hook for data and business logic
  const { providers, isLoading } = useCICD();

  return (
    <div className="w-full border-0 shadow-none">
      <CICDTableClient initialProviders={providers} isLoading={isLoading} />
    </div>
  );
}
