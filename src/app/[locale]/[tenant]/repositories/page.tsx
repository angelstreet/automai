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
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/shadcn/badge';

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

  // Define fetchData outside of useEffect so it can be called from other places
  const fetchData = async () => {
    // Check if a fetch is already in progress
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      // Fetch providers with retry enabled
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
        if (providersResponse.status === 401) {
          router.push('/login');
          return;
        }
        // For non-401 errors, just set empty providers array
        console.log('Failed to fetch providers:', providersResponse.status);
        setProviders([]);
      } else {
        const providersData = await providersResponse.json();
        setProviders(providersData);
      }

      // Fetch all repositories in a single call with retry enabled
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
        if (reposResponse.status === 401) {
          router.push('/login');
          return;
        }
        console.log('Failed to fetch repositories:', reposResponse.status);
        setRepositories([]);
      } else {
        const reposData = await reposResponse.json();
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
      // Call API to refresh all repositories
      const response = await fetchWithAuth('/api/fetch-all-repositories', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh repositories');
      }

      // Refresh data
      isFetchingRef.current = false;
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

  // Render content based on whether providers exist
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (providers.length === 0) {
      return (
        <EmptyState
          title="No Git Providers Connected"
          description="Connect to a Git provider to import your repositories."
          icon={<GitBranch className="h-10 w-10" />}
        />
      );
    }

    return (
      <div className="space-y-8">
        <Tabs
          defaultValue="providers"
          className="w-full"
          value={tabsValue}
          onValueChange={setTabsValue}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="repositories">Repositories</TabsTrigger>
            <TabsTrigger value="providers">Git Providers</TabsTrigger>
          </TabsList>

          {/* Rest of the tabs content */}
        </Tabs>
      </div>
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
