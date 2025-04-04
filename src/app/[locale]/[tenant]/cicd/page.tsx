import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getCICDProviders } from '@/app/actions/cicdAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import CICDContent from './_components/CICDContent';
import CICDSkeleton from './_components/CICDSkeleton';
import CICDActionsClient from './_components/client/CICDActionsClient';
import CICDEventListener from './_components/client/CICDEventListener';

export default async function CICDPage() {
  const t = await getTranslations('cicd');

  // Only fetch provider count for the actions component
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  return (
    <FeaturePageContainer
      title={t('title') || 'CI/CD Integration'}
      description={t('desc') || 'Configure CI/CD providers for automated deployments'}
      actions={<CICDActionsClient providerCount={providers.length} />}
    >
      {/* Hidden component that listens for refresh events */}
      <CICDEventListener />

      <Suspense fallback={<CICDSkeleton />}>
        <CICDContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
