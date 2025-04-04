import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getCICDProviders } from '@/app/actions/cicdAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import CICDProvider from '@/app/providers/CICDProvider';

import CICDContent from './_components/CICDContent';
import CICDSkeletonClient from './_components/client/CICDSkeletonClient';
import CICDActionsClient from './_components/client/CICDActionsClient';

// Simple placeholder component for Actions
function ActionButtons({ count }: { count: number }) {
  return <div>Actions ({count})</div>;
}

export default async function CICDPage() {
  const t = await getTranslations('cicd');

  // Fetch data at the page level
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  return (
    <FeaturePageContainer
      title={t('title') || 'CI/CD Integration'}
      description={t('description') || 'Configure CI/CD providers for automated deployments'}
      actions={<CICDActionsClient providerCount={providers.length} />}
    >
      <CICDProvider initialProviders={providers} initialLoading={false}>
        <Suspense fallback={<CICDSkeletonClient />}>
          <CICDContent />
        </Suspense>
      </CICDProvider>
    </FeaturePageContainer>
  );
}
