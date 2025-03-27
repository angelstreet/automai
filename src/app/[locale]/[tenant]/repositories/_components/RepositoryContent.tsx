import { Card, CardContent } from '@/components/shadcn/card';
import { RepositoryHeader } from './RepositoryHeader';
import { getRepositories } from '@/app/actions/repositories';
import { ClientRepositoryList } from './client/ClientRepositoryList';

export async function RepositoryContent() {
  // Fetch repositories directly in the server component
  const reposResult = await getRepositories();
  
  // Extract data or provide empty defaults
  const repositories = reposResult.success && reposResult.data ? reposResult.data : [];

  return (
    <Card className="w-full">
      <RepositoryHeader />

      <CardContent className="pt-4">
        <ClientRepositoryList 
          initialRepositories={repositories} 
          initialStarredIds={[]} // We'll fetch starred repos on the client
        />
      </CardContent>
    </Card>
  );
}
