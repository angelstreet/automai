'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Plus, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { Repository, GitProvider } from '@/types/repositories';
import { useToast } from '@/components/shadcn/use-toast';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { RepositoryCard, GitProviderCard, AddGitProviderDialog, RepositoryGrid, GitProviderType } from './_components';
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
      <div className="space-y-8">
        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="repositories">Repositories</TabsTrigger>
            <TabsTrigger value="providers">Git Providers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="repositories" className="mt-6">
            {repositories.length === 0 ? (
              <EmptyState
                title={t('no_repositories')}
                description={t('add_provider')}
                icon={<GitBranch className="h-10 w-10" />}
                action={
                  <Button onClick={() => setAddProviderOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('add_provider')}
                  </Button>
                }
              />
            ) : (
              <RepositoryGrid
                repositories={repositories}
                onSyncRepository={handleSyncRepository}
                syncingRepoId={syncingRepoId}
                isLoading={isLoading}
              />
            )}
          </TabsContent>
          
          <TabsContent value="providers" className="mt-6">
            {providers.length === 0 ? (
              <EmptyState
                title={t('no_providers')}
                description={t('connectGit')}
                icon={<GitBranch className="h-10 w-10" />}
                action={
                  <Button onClick={() => setAddProviderOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('add_provider')}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">{t('connectedProviders')}</h2>
                </div>
                
                {providers.map(provider => (
                  <div key={provider.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 font-medium">
                          {provider.displayName}
                          <Badge variant={provider.status === 'connected' ? 'secondary' : 'outline'}>
                            {provider.status === 'connected' ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRefreshProvider(provider.id)}
                            disabled={refreshingProviderId === provider.id}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${refreshingProviderId === provider.id ? 'animate-spin' : ''}`} />
                            Sync Repositories
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteProvider(provider.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-medium">Repositories</h3>
                        {repositories.filter(repo => repo.providerId === provider.id).length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {repositories.filter(repo => repo.providerId === provider.id).length} repositories
                          </span>
                        )}
                      </div>
                      
                      {repositories.filter(repo => repo.providerId === provider.id).length === 0 ? (
                        <div className="text-center p-6 border rounded-lg bg-muted/50">
                          <p className="text-muted-foreground">
                            No repositories found. Click Sync Repositories to import from this provider.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {repositories
                            .filter(repo => repo.providerId === provider.id)
                            .map(repository => (
                              <div key={repository.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/30">
                                <div className="flex flex-col">
                                  <div className="font-medium">{repository.name}</div>
                                  {repository.description && (
                                    <div className="text-sm text-muted-foreground line-clamp-1">{repository.description}</div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {repository.url && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => window.open(repository.url, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleSyncRepository(repository.id)}
                                    disabled={syncingRepoId === repository.id}
                                  >
                                    <RefreshCw className={`h-4 w-4 ${syncingRepoId === repository.id ? 'animate-spin' : ''}`} />
                                  </Button>
                                  <Badge variant={repository.syncStatus === 'SYNCED' ? 'secondary' : 
                                                 repository.syncStatus === 'ERROR' ? 'destructive' : 
                                                 'outline'}>
                                    {repository.syncStatus}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('repositories')} description={t('repositories_description')}>
        <Button onClick={() => setAddProviderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add_provider')}
        </Button>
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