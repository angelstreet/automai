import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DeploymentContent } from './_components/DeploymentContent';
import { DeploymentSkeleton } from './_components/DeploymentSkeleton';
import { DeploymentActions } from './_components/client/DeploymentActions';
import Script from 'next/script';

export default function DeploymentPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader title="Deployments" description="Manage your application deployments">
        <DeploymentActions />
      </PageHeader>

      <div className="mt-6">
        <Suspense fallback={<DeploymentSkeleton />}>
          <DeploymentContent />
        </Suspense>
      </div>
      
      {/* Script to handle custom events for deployment actions */}
      <Script id="deployment-action-handler">
        {`
          document.addEventListener('create-new-deployment', () => {
            // Find the New Deployment button by ID and click it
            const newDeploymentButton = document.getElementById('new-deployment-button');
            if (newDeploymentButton) {
              newDeploymentButton.click();
            } else {
              // Fallback to navigation if button not found
              window.location.href = './deployment/new';
            }
          });
        `}
      </Script>
    </div>
  );
}
