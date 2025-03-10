'use client';

import { ExternalLink, RefreshCw, Search, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/shadcn/button';
import { GitProvider, Repository } from '@/types/repositories';
import { Badge } from '@/components/shadcn/badge';

interface RepositoryTableProps {
  repositories: Repository[];
  providers: GitProvider[];
  selectedProviders: string[];
  searchQuery: string;
  isLoading: boolean;
  syncingRepoId: string | null;
  onSearchChange: (query: string) => void;
  onToggleProviderFilter: (providerName: string) => void;
  onClearFilters: () => void;
  onRefreshRepos: () => void;
  onSyncRepository: (id: string) => void;
}

export function RepositoryTable({
  repositories,
  providers,
  selectedProviders,
  searchQuery,
  isLoading,
  syncingRepoId,
  onSearchChange,
  onToggleProviderFilter,
  onClearFilters,
  onRefreshRepos,
  onSyncRepository,
}: RepositoryTableProps) {
  const t = useTranslations('repositories');

  // Filter repos based on search and selected providers
  const filteredRepos = repositories.filter((repo) => {
    const matchesSearch =
      searchQuery === '' || repo.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProvider =
      selectedProviders.length === 0 ||
      selectedProviders.includes(getProviderName(repo.providerId, providers));

    return matchesSearch && matchesProvider;
  });

  function getProviderName(providerId: string, providers: GitProvider[]): string {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.displayName || '';
  }

  function getProviderColor(providerId: string, providers: GitProvider[]): string {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return '#4285f4';

    return provider.type === 'github'
      ? '#24292e'
      : provider.type === 'gitlab'
        ? '#fc6d26'
        : provider.type === 'gitea'
          ? '#609926'
          : '#4285f4';
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{t('repositories')}</h2>

        <div className="flex items-center space-x-3">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder={`${t('search')} ${t('repositories').toLowerCase()}...`}
              className="pl-8 pr-4 py-2 border rounded w-full"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          </div>

          <Button variant="outline" size="sm" onClick={onRefreshRepos} disabled={isLoading}>
            <RefreshCw size={16} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {selectedProviders.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <div className="flex flex-wrap gap-2">
            {selectedProviders.map((providerName) => {
              const provider = providers.find((p) => p.displayName === providerName);
              const color =
                provider?.type === 'github'
                  ? '#24292e'
                  : provider?.type === 'gitlab'
                    ? '#fc6d26'
                    : provider?.type === 'gitea'
                      ? '#609926'
                      : '#4285f4';

              return (
                <span
                  key={providerName}
                  className="px-2 py-1 rounded-full text-xs flex items-center gap-1"
                  style={{ backgroundColor: `${color}20`, color: color }}
                >
                  {providerName}
                  <button onClick={() => onToggleProviderFilter(providerName)}>×</button>
                </span>
              );
            })}
            <button className="text-xs text-primary" onClick={onClearFilters}>
              {t('clear_all')}
            </button>
          </div>
        </div>
      )}

      {/* Repository Table */}
      {filteredRepos.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('repository')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('provider')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('updated_at')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-border">
              {filteredRepos.map((repo) => {
                const providerName = getProviderName(repo.providerId, providers);
                const providerColor = getProviderColor(repo.providerId, providers);

                return (
                  <tr key={repo.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium">{repo.name}</div>
                          {repo.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {repo.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 py-1 rounded-full text-xs"
                        style={{ backgroundColor: `${providerColor}20`, color: providerColor }}
                      >
                        {providerName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          repo.syncStatus === 'SYNCED'
                            ? 'secondary'
                            : repo.syncStatus === 'ERROR'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {repo.syncStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(repo.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSyncRepository(repo.id)}
                          disabled={syncingRepoId === repo.id}
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${syncingRepoId === repo.id ? 'animate-spin' : ''}`}
                          />
                        </Button>

                        {repo.url && (
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex items-center"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">{t('no_repos_found')}</p>
        </div>
      )}
    </div>
  );
}
