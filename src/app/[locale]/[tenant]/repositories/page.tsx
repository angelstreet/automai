'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Plus, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { Repository, GitProvider, GitProviderType } from '@/types/repositories';
import { useToast } from '@/components/shadcn/use-toast';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import {
  RepositoryCard,
  GitProviderCard,
  AddGitProviderDialog,
  RepositoryGrid,
  GitProviderGrid,
  RepositoryTable,
} from './_components';
import { useTranslations } from 'next-intl';
import { useRepositories } from '@/hooks/useRepositories';
import { useGitProviders } from '@/hooks/useGitProviders';
import { cn } from '@/lib/utils';

export default function RepositoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('repositories');

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [providers, setProviders] = useState<GitProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [tabsValue, setTabsValue] = useState('providers');
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [refreshingProviderId, setRefreshingProviderId] = useState<string | null>(null);
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<GitProvider | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  // Add a ref to track if fetching is already in progress
  const isFetchingRef = useRef(false);

  const {
    repositories: repositoriesFromHooks,
    isLoading: isLoadingRepos,
    syncRepository,
    isSyncing,
    refreshAll: refreshRepositories,
  } = useRepositories();

  const {
    providers: providersFromHooks,
    isLoading: isLoadingProviders,
    refreshProvider,
    isRefreshing: isRefreshingProvider,
    addProvider: addProviderFromHooks,
    isAddingProvider: isAddingProviderFromHooks,
    editProvider,
    editingProvider: editingProviderFromHooks,
    setEditingProvider: setEditingProviderFromHooks,
  } = useGitProviders();

  // Define fetchData outside of useEffect so it can be called from other places
  const fetchData = async () => {
    // Check if a fetch is already in progress
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      // Step 1: Fetch providers from database
      console.log('Fetching Git providers from database...');
      const providersResponse = await fetchWithAuth(
        '/api/git-providers',
        {},
        {
          maxRetries: 3,
          initialDelay: 1000,
          shouldRetry: true,
        },
      );

      if (!providersResponse.ok) {
        // Handle error without redirecting
        console.log('Failed to fetch providers:', providersResponse.status);

        if (providersResponse.status === 401) {
          toast({
            title: 'Authentication Error',
            description: 'Unable to access Git providers. Please check your connection.',
            variant: 'destructive',
          });
        }

        setProviders([]);
        setRepositories([]);
        setIsLoading(false);
        isFetchingRef.current = false;
        return; // Exit early if we can't fetch providers
      }

      // Process provider data
      const providersData = await providersResponse.json();
      setProviders(providersData);

      // Step 2: Check if we have any providers with valid status
      const hasValidProviders =
        providersData.length > 0 &&
        providersData.some((provider) => provider.status === 'connected');

      if (!hasValidProviders) {
        console.log('No valid providers found, skipping repository fetch');
        setRepositories([]);
        setIsLoading(false);
        isFetchingRef.current = false;
        return; // Exit early if no valid providers
      }

      // Step 3: Fetch repositories only if we have valid providers
      console.log('Fetching repositories for providers...');
      const reposResponse = await fetchWithAuth(
        '/api/fetch-all-repositories',
        {},
        {
          maxRetries: 3,
          initialDelay: 1000,
          shouldRetry: true,
        },
      );

      if (!reposResponse.ok) {
        // Handle error without redirecting
        console.log('Failed to fetch repositories:', reposResponse.status);

        if (reposResponse.status === 401) {
          toast({
            title: 'Authentication Error',
            description: 'Unable to access repositories. Please check your connection.',
            variant: 'destructive',
          });
        }

        setRepositories([]);
      } else {
        const reposData = await reposResponse.json();
        console.log(`Fetched ${reposData.length} repositories`);
        setRepositories(reposData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [router, toast]);

  // Handle adding a provider
  const handleAddProvider = async (values: { type: GitProviderType; displayName: string }) => {
    setIsAddingProvider(true);
    try {
      const response = await fetchWithAuth('/api/git-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(`Failed to add provider: ${response.statusText}`);
      }

      const newProvider = await response.json();
      setProviders([...providers, newProvider]);

      toast({
        title: 'Success',
        description: 'Git provider added successfully',
      });

      // Refresh the data to get updated providers and repositories
      isFetchingRef.current = false;
      fetchData();
    } catch (error) {
      console.error('Error adding provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to add provider. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingProvider(false);
      setAddProviderOpen(false);
    }
  };

  // Handle editing a provider
  const handleEditProvider = (provider: GitProvider) => {
    setEditingProvider(provider);
    setAddProviderOpen(true);
  };

  // Handle deleting a provider
  const handleDeleteProvider = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;

    try {
      const response = await fetchWithAuth(`/api/git-providers?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete provider: ${response.statusText}`);
      }

      // Remove provider from state
      setProviders(providers.filter((p) => p.id !== id));
      // Remove associated repositories
      setRepositories(repositories.filter((r) => r.providerId !== id));

      toast({
        title: 'Success',
        description: 'Git provider deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete provider. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle refreshing a provider's repositories
  const handleRefreshProvider = async (id: string) => {
    setRefreshingProviderId(id);
    try {
      const response = await fetchWithAuth(`/api/git-providers/sync?id=${id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh provider: ${response.statusText}`);
      }

      // Refresh the data to get updated repositories
      isFetchingRef.current = false;
      await fetchData();

      toast({
        title: 'Success',
        description: 'Provider repositories refreshed successfully',
      });
    } catch (error) {
      console.error('Error refreshing provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh provider repositories. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRefreshingProviderId(null);
    }
  };

  // Handle syncing a specific repository
  const handleSyncRepository = async (id: string) => {
    setSyncingRepoId(id);
    try {
      const response = await fetchWithAuth(`/api/repositories/sync?id=${id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to sync repository: ${response.statusText}`);
      }

      const updatedRepo = await response.json();

      // Update repository in state
      setRepositories(repositories.map((repo) => (repo.id === id ? updatedRepo : repo)));

      toast({
        title: 'Success',
        description: 'Repository synced successfully',
      });
    } catch (error) {
      console.error('Error syncing repository:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync repository. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSyncingRepoId(null);
    }
  };

  // Toggle provider filter
  const handleToggleProviderFilter = (providerName: string) => {
    setSelectedProviders((prev) =>
      prev.includes(providerName)
        ? prev.filter((p) => p !== providerName)
        : [...prev, providerName],
    );
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedProviders([]);
    setSearchQuery('');
  };

  // Refresh all repositories
  const handleRefreshAllRepositories = async () => {
    setIsRefreshingAll(true);
    try {
      // Step 1: Check if we have valid providers first
      if (providers.length === 0) {
        toast({
          title: 'No Providers',
          description: 'No Git providers found to refresh repositories.',
          variant: 'default',
        });
        return;
      }

      const hasValidProviders = providers.some((provider) => provider.status === 'connected');
      if (!hasValidProviders) {
        toast({
          title: 'No Connected Providers',
          description: 'No connected Git providers found. Please connect a provider first.',
          variant: 'default',
        });
        return;
      }

      // Step 2: Call API to refresh all repositories
      console.log('Refreshing repositories for all providers...');
      const response = await fetchWithAuth('/api/fetch-all-repositories', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh repositories');
      }

      // Step 3: Fetch updated data
      await fetchData();

      toast({
        title: 'Success',
        description: 'All repositories refreshed successfully',
      });
    } catch (error) {
      console.error('Error refreshing repositories:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh repositories. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Filter repositories based on search and selected providers
  const filteredRepositories = repositories.filter((repo) => {
    const matchesSearch =
      searchQuery.toLowerCase() === '' ||
      repo.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider =
      selectedProviders.length === 0 ||
      (repo.provider && selectedProviders.includes(repo.provider.id));
    return matchesSearch && matchesProvider;
  });

  // Render content based on whether providers exist
  const renderContent = () => {
    // If still loading, show loading state
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      );
    }

    // Handle empty states
    if (tabsValue === 'providers' && providers.length === 0) {
      return (
        <EmptyState
          title={t('no_providers')}
          description={t('connectGit')}
          icon={<GitBranch className="h-6 w-6" />}
          action={
            <Button onClick={() => setAddProviderOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('add_provider')}
            </Button>
          }
        />
      );
    }

    if (tabsValue === 'repositories') {
      // If no providers at all, show provider empty state even in repositories tab
      if (providers.length === 0) {
        return (
          <EmptyState
            title={t('no_providers')}
            description={t('connectGit')}
            icon={<GitBranch className="h-6 w-6" />}
            action={
              <Button onClick={() => setAddProviderOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('add_provider')}
              </Button>
            }
          />
        );
      }

      // If providers exist but no repositories, show repositories empty state
      if (repositories.length === 0) {
        return (
          <EmptyState
            title={t('no_repositories')}
            description={t('no_repositories_description')}
            icon={<GitBranch className="h-6 w-6" />}
            action={
              <Button onClick={() => setTabsValue('providers')}>{t('view_providers')}</Button>
            }
          />
        );
      }

      // If repositories exist but none match the filter, show filtered empty state
      if (filteredRepositories.length === 0) {
        return (
          <EmptyState
            title={t('no_repos_found')}
            description={
              searchQuery || selectedProviders.length > 0
                ? t('no_repos_found')
                : t('no_repositories_description')
            }
            icon={<GitBranch className="h-6 w-6" />}
            action={<Button onClick={handleClearFilters}>{t('clear_all')}</Button>}
          />
        );
      }
    }

    // If we have data to show, render the appropriate content
    return (
      <Tabs value={tabsValue} onValueChange={setTabsValue} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="repositories">{t('repositories')}</TabsTrigger>
            <TabsTrigger value="providers">{t('provider_type')}</TabsTrigger>
          </TabsList>
          <div className="flex space-x-2">
            {tabsValue === 'repositories' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAllRepositories}
                disabled={isRefreshingAll}
              >
                {isRefreshingAll ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {t('refreshing')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('refresh')}
                  </>
                )}
              </Button>
            )}
            <Button size="sm" onClick={() => setAddProviderOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('add_provider')}
            </Button>
          </div>
        </div>

        <TabsContent value="repositories" className="mt-0">
          <RepositoryTable
            repositories={filteredRepositories}
            providers={providers}
            selectedProviders={selectedProviders}
            searchQuery={searchQuery}
            isLoading={isLoadingRepos}
            syncingRepoId={isSyncing}
            onSearchChange={setSearchQuery}
            onToggleProviderFilter={(providerId) => {
              setSelectedProviders((prev) =>
                prev.includes(providerId)
                  ? prev.filter((id) => id !== providerId)
                  : [...prev, providerId],
              );
            }}
            onClearFilters={handleClearFilters}
            onRefreshRepos={refreshRepositories}
            onSyncRepository={syncRepository}
          />
        </TabsContent>

        <TabsContent value="providers" className="mt-0">
          <GitProviderGrid
            providers={providers}
            isLoading={isLoadingProviders}
            onRefresh={refreshProvider}
            refreshingProviderId={isRefreshingProvider}
            onEdit={setEditingProviderFromHooks}
          />
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('repositories')} description={t('repositories_description')}>
        {providers.length > 0 && (
          <Button onClick={() => setAddProviderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('add_provider')}
          </Button>
        )}
        <AddGitProviderDialog
          onSubmit={handleAddProvider}
          isSubmitting={isAddingProvider}
          open={addProviderOpen}
          onOpenChange={setAddProviderOpen}
          initialValues={editingProvider}
        />
      </PageHeader>
      {renderContent()}
    </div>
  );
}
