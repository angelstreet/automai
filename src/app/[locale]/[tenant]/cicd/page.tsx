'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { CICDProvider } from './_components';
import { AppProvider } from '@/context';
import { useCICD } from '@/context';

function CICDPageContent() {
  // Get CICD context
  const cicd = useCICD();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader 
        title="CI/CD Integration" 
        description="Configure CI/CD providers for automated deployments"
      />
      
      <CICDProvider />
    </div>
  );
}

export default function CICDPage() {
  return (
    <AppProvider>
      <CICDPageContent />
    </AppProvider>
  );
} 