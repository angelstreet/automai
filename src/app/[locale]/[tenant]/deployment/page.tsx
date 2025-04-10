import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getAllJobs as getDeployments } from '@/app/actions/jobsAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { DeploymentContent } from './_components/DeploymentContent';
import { DeploymentSkeleton } from './_components/DeploymentSkeleton';
import { DeploymentActionsClient } from './_components/client/DeploymentActionsClient';

export default async function DeploymentPage() {
  const t = await getTranslations('team');

  // Fetch initial deployments to get count
  const deploymentsResponse = await getDeployments();
  const deployments = deploymentsResponse.success ? deploymentsResponse.data || [] : [];
  const deploymentCount = deployments.length;

  return (
    <FeaturePageContainer
      title={t('resources_deployments')}
      description={t('desc')}
      actions={<DeploymentActionsClient deploymentCount={deploymentCount} />}
    >
      <Suspense fallback={<DeploymentSkeleton />}>
        <DeploymentContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
