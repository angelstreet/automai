import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { RepositoryContent } from './_components/RepositoryContent';
import { RepositorySkeleton } from './_components/RepositorySkeleton';
import { RepositoryActions } from './_components/client/RepositoryActions';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

// Error component for Repository errors
function RepositoryError({ error }: { error: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
      <h3 className="mb-2 text-lg font-medium">Error loading repositories</h3>
      <p>{error || 'An unknown error occurred'}</p>
    </div>
  );
}

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
