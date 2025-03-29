import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import CICDContent from './_components/CICDContent';
import CICDSkeleton from './_components/CICDSkeleton';
import { CICDActions } from './_components/client/CICDActions';

export default async function CICDPage() {
  const t = await getTranslations('cicd');

  return (
    <FeaturePageContainer
      title={t('title') || 'CI/CD Integration'}
      description={t('description') || 'Configure CI/CD providers for automated deployments'}
      actions={<CICDActions />}
    >
      <Suspense fallback={<CICDSkeleton />}>
        <CICDContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
