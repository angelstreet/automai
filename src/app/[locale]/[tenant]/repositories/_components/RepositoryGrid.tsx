import { useState } from 'react';
import { Repository } from '@/types/repositories';
import { RepositoryCard } from './EnhancedRepositoryCard';
import { Input } from '@/components/shadcn/input';
import { Search } from 'lucide-react';

interface RepositoryGridProps {
  repositories: Repository[];
  onSyncRepository: (id: string) => Promise<void>;
  syncingRepoId: string | null;
  isLoading?: boolean;
}

export function RepositoryGrid({
  repositories,
  onSyncRepository,
  syncingRepoId,
  isLoading = false,
}: RepositoryGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState<string | null>(null);

  // Filter repositories based on search term
  const filteredRepositories = repositories.filter((repo) => {
    const matchesSearch =
      !searchTerm ||
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesProvider = !providerFilter || repo.providerId === providerFilter;

    return matchesSearch && matchesProvider;
  });

  // Get unique providers for filtering
  const providers = repositories.reduce(
    (acc, repo) => {
      if (repo.provider && !acc.some((p) => p.id === repo.providerId)) {
        acc.push({
          id: repo.providerId,
          name: repo.provider.displayName || repo.provider.name,
        });
      }
      return acc;
    },
    [] as { id: string; name: string | any }[],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {providers.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Provider:</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
              value={providerFilter || ''}
              onChange={(e) => setProviderFilter(e.target.value || null)}
            >
              <option value="">All</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredRepositories.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">
            {repositories.length === 0
              ? 'No repositories found. Add a Git provider to import repositories.'
              : 'No repositories match your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepositories.map((repository) => (
            <RepositoryCard
              key={repository.id}
              repository={repository}
              onSync={onSyncRepository}
              isSyncing={syncingRepoId === repository.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
