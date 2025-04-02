import { ReactNode } from 'react';
import { getRepositories } from '@/app/actions/repositoriesAction';
import { Card, CardContent } from '@/components/shadcn/card';
import { WithPageMetadata } from '@/components/layout/PageMetadata';

import { ClientRepositoryList } from './client/ClientRepositoryList';

interface RepositoryContentProps extends WithPageMetadata {}

export async function RepositoryContent({ pageMetadata }: RepositoryContentProps = {}) {
  const reposResult = await getRepositories();

  const repositories = reposResult.success && reposResult.data ? reposResult.data : [];

  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent>
        <ClientRepositoryList initialRepositories={repositories} initialStarredIds={[]} />
      </CardContent>
    </Card>
  );
}
