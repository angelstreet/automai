'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { CICDProvider } from './_components';
import { useCICD, CICDContextProvider } from '@/context';
import { Button } from '@/components/shadcn/button';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';

function CICDPageContent() {
  // Get CICD context
  const cicd = useCICD();
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col gap-4">
        <PageHeader
          title="CI/CD Integration"
          description="Configure CI/CD providers for automated deployments"
        >
          <Button
            onClick={() => document.dispatchEvent(new CustomEvent('add-cicd-provider'))}
            size="sm"
            className="h-8 gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Provider</span>
          </Button>
        </PageHeader>

        <CICDProvider removeTitle={true} />
      </div>
    </div>
  );
}

export default function CICDPage() {
  // Wrap page with just the CICD context provider
  return (
    <CICDContextProvider>
      <CICDPageContent />
    </CICDContextProvider>
  );
}