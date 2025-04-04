import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getDeployments } from '@/app/actions/deploymentsAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { DeploymentActionsClient } from './_components/client/DeploymentActionsClient';
import { DeploymentContent } from './_components/DeploymentContent';
import { DeploymentSkeleton } from './_components/DeploymentSkeleton';

export default async function DeploymentPage() {
  const t = await getTranslations('deployments');

  // Fetch initial deployments to get count
  const deploymentsResponse = await getDeployments();
  const deployments = deploymentsResponse.success ? deploymentsResponse.data || [] : [];
  const deploymentCount = deployments.length;

  return (
    <FeaturePageContainer
      title={t('deployments')}
      description={t('deployments_description')}
      actions={<DeploymentActionsClient deploymentCount={deploymentCount} />}
    >
      <Suspense fallback={<DeploymentSkeleton />}>
        <DeploymentContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
