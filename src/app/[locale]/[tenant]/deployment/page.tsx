import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DeploymentContent } from './_components/DeploymentContent';
import { DeploymentSkeleton } from './_components/DeploymentSkeleton';
import { DeploymentActions } from './_components/client/DeploymentActions';

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
    </div>
  );
}
