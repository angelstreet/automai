import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { DeploymentContent } from './_components/DeploymentContent';
import { DeploymentSkeleton } from './_components/DeploymentSkeleton';
import { DeploymentActions } from './_components/client/DeploymentActions';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

export default async function DeploymentPage() {
  const t = await getTranslations('deployments');

  return (
    <FeaturePageContainer
      title={t('deployments')}
      description={t('deployments_description')}
      actions={<DeploymentActions />}
    >
      <Suspense fallback={<DeploymentSkeleton />}>
        <DeploymentContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
