import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getCICDProviders } from '@/app/actions/cicdAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { CICDActionsClient } from './_components/client/CICDActionsClient';
import CICDContent from './_components/CICDContent';
import CICDSkeleton from './_components/CICDSkeleton';

export default async function CICDPage() {
  const t = await getTranslations('cicd');

  // Fetch data at the page level only for the actions count
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];
  const providerCount = providers.length;

  return (
    <FeaturePageContainer
      title={t('title') || 'CI/CD Integration'}
      description={t('description') || 'Configure CI/CD providers for automated deployments'}
      actions={<CICDActionsClient providerCount={providerCount} />}
    >
      <Suspense fallback={<CICDSkeleton />}>
        <CICDContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
