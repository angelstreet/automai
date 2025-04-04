import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getCICDProviders } from '@/app/actions/cicdAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import CICDContent from './_components/CICDContent';
import CICDSkeletonClient from './_components/client/CICDSkeletonClient';
import CICDActionsClient from './_components/client/CICDActionsClient';

export default async function CICDPage() {
  const t = await getTranslations('cicd');

  // Fetch data at the page level only for the actions count
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  return (
    <FeaturePageContainer
      title={t('title') || 'CI/CD Integration'}
      description={t('description') || 'Configure CI/CD providers for automated deployments'}
      actions={<CICDActionsClient providerCount={providers.length} />}
    >
      <Suspense fallback={<CICDSkeletonClient />}>
        <CICDContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
