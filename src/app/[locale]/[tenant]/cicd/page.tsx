import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getCICDProviders } from '@/app/actions/cicdAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import CICDContent from './_components/CICDContent';
import CICDSkeleton from './_components/CICDSkeleton';
import { CICDActionsClient } from './_components/client/CICDActionsClient';
import { CICDProvider } from './_components/providers';

export default async function CICDPage() {
  const t = await getTranslations('cicd');

  // Fetch data at the page level
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  return (
    <FeaturePageContainer
      title={t('title') || 'CI/CD Integration'}
      description={t('description') || 'Configure CI/CD providers for automated deployments'}
      actions={<CICDActionsClient />}
    >
      <CICDProvider initialProviders={providers} initialLoading={false}>
        <Suspense fallback={<CICDSkeleton />}>
          <CICDContent />
        </Suspense>
      </CICDProvider>
    </FeaturePageContainer>
  );
}
