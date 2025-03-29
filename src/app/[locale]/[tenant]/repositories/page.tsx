import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { RepositoryContent } from './_components/RepositoryContent';
import { RepositorySkeleton } from './_components/RepositorySkeleton';
import { RepositoryActions } from './_components/client/RepositoryActions';

export default async function RepositoriesPage() {
  const t = await getTranslations('repositories');

  return (
    <FeaturePageContainer
      title={t('repositories')}
      description={t('repositories_description')}
      actions={<RepositoryActions />}
    >
      <Suspense fallback={<RepositorySkeleton />}>
        <RepositoryContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
