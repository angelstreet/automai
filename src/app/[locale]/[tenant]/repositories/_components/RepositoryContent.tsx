import { getRepositories } from '@/app/actions/repositories';
import { Card, CardContent } from '@/components/shadcn/card';

import { ClientRepositoryList } from './client/ClientRepositoryList';

export async function RepositoryContent() {
  // Fetch repositories directly in the server component
  const reposResult = await getRepositories();

  // Extract data or provide empty defaults
  const repositories = reposResult.success && reposResult.data ? reposResult.data : [];

  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent>
        <ClientRepositoryList
          initialRepositories={repositories}
          initialStarredIds={[]} // We'll fetch starred repos on the client
        />
      </CardContent>
    </Card>
  );
}
