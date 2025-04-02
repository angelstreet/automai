import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getRepositories } from '@/app/actions/repositoriesAction';

import { RepositoryContent } from './_components/RepositoryContent';
import { RepositorySkeleton } from './_components/RepositorySkeleton';
import { RepositoryActionsClient } from './_components/RepositoryActionsClient';

export default async function RepositoriesPage() {
  const t = await getTranslations('repositories');
  const reposResult = await getRepositories();
  const repositories = reposResult.success && reposResult.data ? reposResult.data : [];

  // Using pageMetadata that will be automatically extracted by FeaturePageContainer
  return (
    <Suspense fallback={<RepositorySkeleton />}>
      <RepositoryContent 
        pageMetadata={{
          title: t('repositories'),
          description: t('repositories_description'),
          actions: <RepositoryActionsClient repositoryCount={repositories.length} />
        }}
      />
    </Suspense>
  );
}
