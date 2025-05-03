import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getAllJobs as getDeployments } from '@/app/actions/jobsAction';
import { getUser } from '@/app/actions/userAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { DeploymentContent } from './_components/DeploymentContent';
import { DeploymentSkeleton } from './_components/DeploymentSkeleton';
import { DeploymentActionsClient } from './_components/client/DeploymentActionsClient';

export default async function DeploymentPage() {
  const t = await getTranslations('team');

  // Get user once for all API calls
  const user = await getUser();

  // Fetch deployments once at the page level and pass the user
  const deploymentsResponse = await getDeployments(user);
  const deployments = deploymentsResponse.success ? deploymentsResponse.data || [] : [];
  const deploymentCount = deployments.length;

  return (
    <FeaturePageContainer
      title={t('resources_deployments')}
      description={t('desc')}
      actions={<DeploymentActionsClient deploymentCount={deploymentCount} />}
    >
      <Suspense fallback={<DeploymentSkeleton />}>
        <DeploymentContent initialDeployments={deployments} user={user} />
      </Suspense>
    </FeaturePageContainer>
  );
}
