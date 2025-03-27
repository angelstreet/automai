import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import CICDContent from './_components/CICDContent';
import CICDSkeleton from './_components/CICDSkeleton';
import { CICDActions } from './_components/client/CICDActions';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

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
