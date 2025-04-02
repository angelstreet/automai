import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { DeploymentActionsClient } from './_components/DeploymentActionsClient';
import { DeploymentContent } from './_components/DeploymentContent';
import { DeploymentSkeleton } from './_components/DeploymentSkeleton';

export default async function DeploymentPage() {
  const t = await getTranslations('deployments');

  return (
    <FeaturePageContainer
      title={t('deployments')}
      description={t('deployments_description')}
      actions={<DeploymentActionsClient />}
    >
      <Suspense fallback={<DeploymentSkeleton />}>
        <DeploymentContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
