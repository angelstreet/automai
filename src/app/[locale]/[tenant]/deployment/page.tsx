import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { DeploymentContent } from './_components/DeploymentContent';
import { DeploymentSkeleton } from './_components/DeploymentSkeleton';
import { DeploymentActions } from './_components/client/DeploymentActions';

export default async function DeploymentPage() {
  const t = await getTranslations('deployments');

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader title={t('deployments')} description={t('deployments_description')}>
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
