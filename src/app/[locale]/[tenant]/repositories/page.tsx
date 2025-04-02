import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getRepositories } from '@/app/actions/repositoriesAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { RepositoryActionsClient } from './_components/RepositoryActionsClient';
import { RepositoryContent } from './_components/RepositoryContent';
import { RepositorySkeleton } from './_components/RepositorySkeleton';

export default async function RepositoriesPage() {
  const t = await getTranslations('repositories');
  const reposResult = await getRepositories();
  const repositories = reposResult.success && reposResult.data ? reposResult.data : [];

  // Using direct approach for clarity
  return (
    <FeaturePageContainer
      title={t('repositories')}
      description={t('repositories_description')}
      actions={<RepositoryActionsClient repositoryCount={repositories.length} />}
    >
      <Suspense fallback={<RepositorySkeleton />}>
        <RepositoryContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
