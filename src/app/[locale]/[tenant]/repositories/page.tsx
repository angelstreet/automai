import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { RepositoryContent } from './_components/RepositoryContent';
import { RepositorySkeleton } from './_components/RepositorySkeleton';
import { RepositoryActions } from './_components/client/RepositoryActions';

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
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col gap-4">
        <PageHeader 
          title={t('repositories')} 
          description={t('repositories_description')}
        >
          <RepositoryActions />
        </PageHeader>

        <Suspense fallback={<RepositorySkeleton />}>
          <RepositoryContent />
        </Suspense>
      </div>
    </div>
  );
}
