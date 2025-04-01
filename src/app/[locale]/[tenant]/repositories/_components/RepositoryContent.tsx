import { getRepositories } from '@/app/actions/repositoriesAction';
import { Card, CardContent } from '@/components/shadcn/card';

import { ClientRepositoryList } from './client/ClientRepositoryList';

export async function RepositoryContent() {
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
