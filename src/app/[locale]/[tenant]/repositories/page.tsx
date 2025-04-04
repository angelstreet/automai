import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getRepositories } from '@/app/actions/repositoriesAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { RepositoryActionsClient, RepositoryContent, RepositorySkeletonClient } from './_components';

export default async function RepositoriesPage() {
  const t = await getTranslations('repositories');
  const reposResult = await getRepositories();
  const repositories = reposResult.success && reposResult.data ? reposResult.data : [];

  // Using direct approach for clarity
  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('desc')}
      actions={<RepositoryActionsClient repositoryCount={repositories.length} />}
    >
      <Suspense fallback={<RepositorySkeletonClient />}>
        <RepositoryContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
