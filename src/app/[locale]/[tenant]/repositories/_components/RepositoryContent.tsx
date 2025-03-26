import { Card, CardContent } from '@/components/shadcn/card';
import { RepositoryList } from './RepositoryList';
import { RepositoryHeader } from './RepositoryHeader';
import { getRepositoriesWithStarred } from '@/app/actions/repositories';

export async function RepositoryContent() {
  // Fetch repository data directly on the server
  const result = await getRepositoriesWithStarred();

  // Extract data or provide empty defaults
  const repositories = result.success && result.data ? result.data.repositories : [];
  const starredRepositoryIds =
    result.success && result.data ? result.data.starredRepositoryIds : [];

  // Convert starredRepositoryIds to Set for easier use in the component
  const starredRepos = new Set(starredRepositoryIds);

  return (
    <Card className="w-full">
      <RepositoryHeader />

      <CardContent className="pt-4">
        <RepositoryList
          repositories={repositories}
          starredRepos={starredRepos}
          error={result.success ? undefined : result.error}
        />
      </CardContent>
    </Card>
  );
}
