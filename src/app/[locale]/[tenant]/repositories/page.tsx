'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Plus } from 'lucide-react';
import { Repository, GitProvider } from '@/types/repositories';
import { useToast } from '@/components/shadcn/use-toast';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { RepositoryCard, GitProviderCard, AddGitProviderDialog, GitProviderType } from './_components';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import { useTranslations } from 'next-intl';

export default function RepositoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('repositories');
  
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [providers, setProviders] = useState<GitProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [refreshingProviderId, setRefreshingProviderId] = useState<string | null>(null);
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  
  // Add a ref to track if fetching is already in progress
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      // Check if a fetch is already in progress
      if (isFetchingRef.current) return;
      
      isFetchingRef.current = true;
      setIsLoading(true);
      
      try {
        // Fetch providers with retry enabled
        const providersResponse = await fetchWithAuth('/api/git-providers', {}, { 
          maxRetries: 3, 
          initialDelay: 1000, 
          shouldRetry: true 
        });
        
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
        const reposResponse = await fetchWithAuth('/api/fetch-all-repositories', {}, { 
          maxRetries: 3, 
          initialDelay: 1000, 
          shouldRetry: true 
        });
        
        if (!reposResponse.ok) {
          if (reposResponse.status === 401) {
            router.push('/login');
            return;
          }
          
          // Don't show error toast for 400 (no repositories found) or 404 (table doesn't exist)
          if (reposResponse.status !== 400 && reposResponse.status !== 404) {
            console.error('Error fetching repositories:', reposResponse.status);
          } else {
            console.log('No repositories found or table does not exist yet');
          }
          // Set empty repositories array for any error
          setRepositories([]);
        } else {
          const reposData = await reposResponse.json();
          setRepositories(reposData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Only show toast for unexpected errors, not for "Failed to fetch" which is common
        if (!(error instanceof Error && error.message.includes('Failed to fetch'))) {
          toast({
            title: 'Error',
            description: 'Failed to load repositories and providers',
            variant: 'destructive',
          });
        }
        // Set empty arrays for both
        setProviders([]);
        setRepositories([]);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchData();
  }, [router, toast]);

  const handleAddProvider = async (values: { type: GitProviderType; displayName: string }) => {
    // Prevent multiple simultaneous provider additions
    if (isFetchingRef.current || isAddingProvider) return;
    
    setIsAddingProvider(true);
    isFetchingRef.current = true;
    
    try {
      const response = await fetchWithAuth('/api/git-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      }, { shouldRetry: true, maxRetries: 2, initialDelay: 500 });

      if (!response.ok) {
        throw new Error('Failed to add provider');
      }

      const provider = await response.json();
      
      // Redirect to the OAuth flow
      if (provider.authUrl) {
        window.location.href = provider.authUrl;
      } else {
        setProviders([...providers, provider]);
        setAddProviderOpen(false);
        toast({
          title: 'Success',
          description: 'Git provider added successfully',
        });
      }
    } catch (error) {
      console.error('Error adding provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to add Git provider',
        variant: 'destructive',
      });
    } finally {
      setIsAddingProvider(false);
      isFetchingRef.current = false;
    }
  };

  const handleDeleteProvider = async (id: string) => {
    // Prevent multiple simultaneous deletions
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    
    try {
      const response = await fetchWithAuth(`/api/git-providers/${id}`, {
        method: 'DELETE',
      }, { shouldRetry: true, maxRetries: 2, initialDelay: 500 });

      if (!response.ok) {
        throw new Error('Failed to delete provider');
      }

      setProviders(providers.filter(provider => provider.id !== id));
      // Also remove repositories associated with this provider
      setRepositories(repositories.filter(repo => repo.providerId !== id));
      
      toast({
        title: 'Success',
        description: 'Git provider deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete Git provider',
        variant: 'destructive',
      });
    } finally {
      isFetchingRef.current = false;
    }
  };

  const handleRefreshProvider = async (id: string) => {
    // Prevent multiple simultaneous refreshes
    if (isFetchingRef.current || refreshingProviderId) return;
    
    setRefreshingProviderId(id);
    isFetchingRef.current = true;
    
    try {
      const response = await fetchWithAuth(`/api/git-providers/${id}/sync`, {
        method: 'POST',
      }, { shouldRetry: true, maxRetries: 2, initialDelay: 500 });

      if (!response.ok) {
        throw new Error('Failed to refresh provider');
      }

      const { repositories: updatedRepos } = await response.json();
      
      // Update repositories list
      setRepositories(prev => {
        const existingRepoIds = updatedRepos.map((repo: Repository) => repo.id);
        const filteredRepos = prev.filter(repo => 
          repo.providerId !== id || existingRepoIds.includes(repo.id)
        );
        return [...filteredRepos, ...updatedRepos.filter((repo: Repository) => 
          !filteredRepos.some(r => r.id === repo.id)
        )];
      });
      
      // Update provider's lastSyncedAt
      setProviders(prev => 
        prev.map(provider => 
          provider.id === id 
            ? { ...provider, lastSyncedAt: new Date().toISOString() } 
            : provider
        )
      );
      
      toast({
        title: 'Success',
        description: 'Repositories synced successfully',
      });
    } catch (error) {
      console.error('Error refreshing provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync repositories',
        variant: 'destructive',
      });
    } finally {
      setRefreshingProviderId(null);
      isFetchingRef.current = false;
    }
  };

  const handleSyncRepository = async (id: string) => {
    // Prevent multiple simultaneous syncs
    if (isFetchingRef.current || syncingRepoId) return;
    
    setSyncingRepoId(id);
    isFetchingRef.current = true;
    
    try {
      const response = await fetchWithAuth(`/api/repositories/sync/${id}`, {
        method: 'POST',
      }, { shouldRetry: true, maxRetries: 2, initialDelay: 500 });

      if (!response.ok) {
        throw new Error('Failed to sync repository');
      }

      const updatedRepo = await response.json();
      
      // Update the repository in the list
      setRepositories(prev => 
        prev.map(repo => 
          repo.id === id ? updatedRepo : repo
        )
      );
      
      toast({
        title: 'Success',
        description: 'Repository synced successfully',
      });
    } catch (error) {
      console.error('Error syncing repository:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync repository',
        variant: 'destructive',
      });
    } finally {
      setSyncingRepoId(null);
      isFetchingRef.current = false;
    }
  };

  // Filter repositories based on the active tab
  const filteredRepositories = repositories.filter(repo => {
    if (activeTab === 'all') return true;
    // Check if the repository has a project property that indicates it's personal
    if (activeTab === 'personal') return repo.project?.name?.toLowerCase().includes('personal') || false;
    return false;
  });

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
          action={
            <AddGitProviderDialog
              onSubmit={handleAddProvider}
              isSubmitting={isAddingProvider}
              open={addProviderOpen}
              onOpenChange={setAddProviderOpen}
            />
          }
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Repositories</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(provider => (
            <GitProviderCard
              key={provider.id}
              provider={provider}
              onDelete={handleDeleteProvider}
              onRefresh={handleRefreshProvider}
              isRefreshing={refreshingProviderId === provider.id}
            />
          ))}
        </div>

        {filteredRepositories.length > 0 ? (
          <div>
            <h3 className="text-lg font-medium mb-4">Repositories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRepositories.map(repo => (
                <RepositoryCard
                  key={repo.id}
                  repository={repo}
                  onSync={handleSyncRepository}
                  isSyncing={syncingRepoId === repo.id}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No Repositories Found"
            description="Sync your Git provider to import repositories."
            icon={<GitBranch className="h-10 w-10" />}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('repositories')} description={t('repositories_description')}>
        <AddGitProviderDialog
          onSubmit={handleAddProvider}
          isSubmitting={isAddingProvider}
          open={addProviderOpen}
          onOpenChange={setAddProviderOpen}
        />
      </PageHeader>
      {renderContent()}
    </div>
  );
} 