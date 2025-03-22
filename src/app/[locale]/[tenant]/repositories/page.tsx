'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { GitBranch, Plus, RefreshCw, Search, Filter, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRepository } from '@/context';
import { RepositoryContextType } from '@/types/context/repository';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { useToast } from '@/components/shadcn/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';

import { EnhancedRepositoryCard } from './_components/EnhancedRepositoryCard';
import { RepositoryExplorer } from './_components/RepositoryExplorer';
import { EnhancedConnectRepositoryDialog } from './_components/EnhancedConnectRepositoryDialog';

import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';

import { Repository, ConnectRepositoryValues } from './types';
import { REPOSITORY_CATEGORIES } from './constants';

export default function EnhancedRepositoryPage() {
  const { toast } = useToast();
  const t = useTranslations('repositories');
  
  // Use the repository context from the new context system
  const repositoryContext = useRepository();

  // Handle the case where context is still initializing (null)
  // IMPORTANT: Do not provide fallback values for repositories and starredRepositories
  // Let them be undefined if not provided by the context
  const {
    repositories,
    loading = false,
    error = null,
    fetchRepositories = async () => { 
      console.log('Repository context not initialized'); 
      return [];
    },
    // Custom properties not in the official RepositoryContextType interface but used in our component
    starredRepositories = [],
    starRepository = () => { 
      console.log('Repository context not initialized'); 
    },
    unstarRepository = () => {
      console.log('Repository context not initialized');
    },
    deleteRepository = () => {
      console.log('Repository context not initialized');
    },
    createRepository = () => {
      console.log('Repository context not initialized');
    },
    user = null,
    providers = [],
  } = repositoryContext || {};
  
  // Rename loading to isLoading for our component
  const isLoading = loading;
  // State for UI
  const [starredRepos, setStarredRepos] = useState<Set<string>>(() => {
    // Initialize from context's starredRepositories
    const initialStarred = new Set<string>();
    if (starredRepositories) {
      starredRepositories.forEach(repo => {
        if (repo && repo.id) initialStarred.add(repo.id);
      });
    }
    return initialStarred;
  });
  const [activeTab, setActiveTab] = useState<string>('all');
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('lastUpdated');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [connectDialogOpen, setConnectDialogOpen] = useState<boolean>(false);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [isExplorerView, setIsExplorerView] = useState<boolean>(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState<boolean>(false);
  const [syncingRepoIds, setSyncingRepoIds] = useState<Record<string, boolean>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [repositoryToDelete, setRepositoryToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  // Refresh repositories on mount if empty
  useEffect(() => {
    // Always trigger a fetch when component mounts
    console.log('[RepositoriesPage] Component mounted, triggering repository fetch');
    fetchRepositories();
  }, [fetchRepositories]);
  
  // Update starredRepos when starredRepositories change in context
  useEffect(() => {
    if (starredRepositories && starredRepositories.length > 0) {
      console.log('[RepositoriesPage] Updating starredRepos from context:', starredRepositories.length);
      
      const newStarred = new Set<string>();
      starredRepositories.forEach(repo => {
        if (repo && repo.id) newStarred.add(repo.id);
      });
      
      setStarredRepos(newStarred);
    }
  }, [starredRepositories]);

  // Handle repository starring/unstarring
  const handleToggleStarred = async (id: string): Promise<void> => {
    // Optimistic UI update
    setStarredRepos(prev => {
      const newStarred = new Set(prev);
      if (newStarred.has(id)) {
        newStarred.delete(id);
      } else {
        newStarred.add(id);
      }
      return newStarred;
    });

    // Find the repository object to toggle star status
    if (!repositories) {
      console.error('Repositories array is undefined');
      return;
    }
    
    const repository = repositories.find(repo => repo.id === id);
    if (!repository) {
      console.error('Repository not found for ID:', id);
      return;
    }

    // Call context method to toggle star
    try {
      // No need to await since toggleStarRepository is synchronous
      starRepository(repository);
    } catch (error: unknown) {
      console.error('Error updating starred status:', error);
      
      // Revert the optimistic update on error
      setStarredRepos(prev => {
        const revertedStarred = new Set(prev);
        if (revertedStarred.has(id)) {
          revertedStarred.delete(id);
        } else {
          revertedStarred.add(id);
        }
        return revertedStarred;
      });
      
      toast({
        title: 'Error',
        description: t('starredUpdateFailed'),
        variant: 'destructive',
      });
    }
  };

  // Handle refreshing all repositories
  const handleRefreshAll = async (): Promise<void> => {
    if (isRefreshingAll || !repositories || repositories.length === 0) return;
    
    setIsRefreshingAll(true);
    console.log("[DEBUG] Starting handleRefreshAll for", repositories.length, "repositories");
    
    try {
      // Import the test repository action and repository update action
      const { testGitRepository, updateRepository, clearRepositoriesCache } = await import('@/app/[locale]/[tenant]/repositories/actions');
      
      // First clear the cache to ensure we'll get fresh data
      await clearRepositoriesCache();
      
      // Process each repository one by one
      for (const repo of repositories as Repository[]) {
        try {
          // Skip repositories without a URL
          if (!repo.url) {
            console.log(`Repository ${repo.id} has no URL, skipping test`);
            continue;
          }
          
          // Update state to show this specific repo is syncing
          setSyncingRepoIds(prev => ({ ...prev, [repo.id]: true }));
          
          // Create test data with the repository URL
          const testData = {
            url: repo.url,
            token: repo.provider?.token || ''
          };
          
          console.log(`[DEBUG] Testing repository ${repo.id} (${repo.name}) with URL: ${repo.url}`);
          
          // Test the repository
          const result = await testGitRepository(testData);
          
          console.log(`Repository ${repo.name} test result:`, result);
          
          // Update repository syncStatus based on test result
          if (repo.id && user?.id) {
            let newSyncStatus: 'SYNCED' | 'FAILED' | 'IDLE' = 'IDLE';
            
            if (result.success) {
              newSyncStatus = 'SYNCED';
            } else if (result.error || result.status === 404 || result.status === 401 || result.status === 403) {
              newSyncStatus = 'FAILED';
            }
            
            console.log(`[DEBUG] Updating repository ${repo.id} status to ${newSyncStatus}`);
            
            // Get the current user for the update call
            try {
              // Update the repository in the database - need to use current user
              const updateResult = await updateRepository(repo.id, { 
                syncStatus: newSyncStatus,
                lastSyncedAt: new Date().toISOString()
              });
              console.log(`[DEBUG] Update result for ${repo.id}:`, updateResult);
            } catch (updateError) {
              console.error(`Error updating repository ${repo.id} status:`, updateError);
            }
          } else {
            console.warn(`[DEBUG] Cannot update repository ${repo.id}, user.id: ${user?.id}`);
          }
          
          // Small delay between tests to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error testing repository ${repo.id}:`, error);
        } finally {
          // Mark this repo as no longer syncing
          setSyncingRepoIds(prev => ({ ...prev, [repo.id]: false }));
        }
      }
      
      console.log("[DEBUG] Repository tests complete, refreshing repository list");
      
      // Clear the cache again before the final refresh to ensure we get the most up-to-date data
      await clearRepositoriesCache();
      
      // Refresh the entire list after all tests are complete
      await fetchRepositories();
    } catch (error: unknown) {
      console.error('Error refreshing repositories:', error);
    } finally {
      setIsRefreshingAll(false);
      // Clear all syncing states
      setSyncingRepoIds({});
    }
  };

  // Re-implement handleSyncRepository for individual repository sync
  const handleSyncRepository = async (id: string): Promise<void> => {
    if (!id) return;
    
    try {
      setSyncingRepoId(id);
      setSyncingRepoIds(prev => ({ ...prev, [id]: true }));
      
      // Import the test repository action and repository update action
      const { testGitRepository, updateRepository, clearRepositoriesCache } = await import('@/app/[locale]/[tenant]/repositories/actions');
      
      // Clear the cache to ensure we'll get fresh data
      await clearRepositoriesCache();
      
      // Find the repository
      const repo = repositories?.find(r => r.id === id);
      if (!repo) {
        console.error('Repository not found');
        return;
      }
      
      // Skip repositories without a URL
      if (!repo.url) {
        console.log(`Repository ${repo.id} has no URL, skipping test`);
        return;
      }
      
      // Create test data with the repository URL
      const testData = {
        url: repo.url,
        token: repo.provider?.token || ''
      };
      
      // Test the repository
      const result = await testGitRepository(testData);
      
      console.log(`Repository ${repo.name} test result:`, result);
      
      // Update repository syncStatus based on test result
      if (repo.id && user?.id) {
        let newSyncStatus: 'SYNCED' | 'FAILED' | 'IDLE' = 'IDLE';
        
        if (result.success) {
          newSyncStatus = 'SYNCED';
        } else if (result.error || result.status === 404 || result.status === 401 || result.status === 403) {
          newSyncStatus = 'FAILED';
        }
        
        try {
          // Update the repository in the database - need to use current user
          await updateRepository(repo.id, { 
            syncStatus: newSyncStatus,
            lastSyncedAt: new Date().toISOString()
          });
        } catch (updateError) {
          console.error(`Error updating repository ${repo.id} status:`, updateError);
        }
      }
      
      // Clear the cache again before the final refresh
      await clearRepositoriesCache();
      
      // Refresh the repository list
      await fetchRepositories();
    } catch (error: unknown) {
      console.error('Error testing repository connection:', error);
    } finally {
      setSyncingRepoId(null);
      setSyncingRepoIds(prev => ({ ...prev, [id]: false }));
    }
  };

  // Handle repository connection
  const handleConnectRepository = async (values: ConnectRepositoryValues): Promise<void> => {
    console.log('Connect repository:', values);
    
    try {
      // Connect repository via API
      const connectResponse = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!connectResponse.ok) {
        const errorData = await connectResponse.json();
        throw new Error(errorData.error || 'Failed to connect repository');
      }
      
      // Refresh repositories after connection
      await fetchRepositories();
      
      toast({
        title: 'Success',
        description: t('connectSuccess'),
      });
    } catch (error: unknown) {
      console.error('Error connecting repository:', error);
      
      toast({
        title: 'Warning',
        description: 'Repository may have been added. Please refresh the page.',
      });
    }
  };

  // Handle repository deletion
  const handleDeleteRepository = (id: string): void => {
    setRepositoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRepository = async (): Promise<void> => {
    if (!repositoryToDelete) return;
    
    setIsDeleting(repositoryToDelete);
    try {
      // Manually call the API endpoint to delete the repository
      const response = await fetch(`/api/repositories/${repositoryToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete repository');
      }
      
      // Refresh repositories after deletion
      await fetchRepositories();
      
      toast({
        title: 'Success',
        description: t('deleteSuccess'),
      });
      
      setDeleteDialogOpen(false);
    } catch (error: unknown) {
      console.error('Error deleting repository:', error);
      toast({
        title: 'Error',
        description: t('deleteFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
      setRepositoryToDelete(null);
    }
  };

  const cancelDeleteRepository = (): void => {
    setDeleteDialogOpen(false);
    setRepositoryToDelete(null);
  };

  // Safely handle potentially undefined repositories array
  const repoArray = repositories || [];
  // Filter repositories
  const filteredRepositories: Repository[] = repoArray
    .filter((repo: Repository) => {
      // We've already checked for null/undefined in the context, but just to be safe
      if (!repo) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const repoName = repo.name ? repo.name.toLowerCase() : '';
        const repoOwner = repo.owner ? repo.owner.toLowerCase() : '';
        const repoDescription = repo.description ? repo.description.toLowerCase() : '';
        
        if (!repoName.includes(query) && 
            !repoOwner.includes(query) && 
            !repoDescription.includes(query)) {
          return false;
        }
      }
      
      // Filter by tab
      if (activeTab === 'public' && repo.isPrivate === true) return false;
      if (activeTab === 'private' && repo.isPrivate !== true) return false;
      if (activeTab === 'starred' && !starredRepos.has(repo.id)) return false;
      
      // Filter by category
      if (filterCategory !== 'All') {
        // For now, we don't have any category filtering yet
        // Will be implemented when repository categories are available
      }
      
      return true;
    })
    .sort((a, b) => {
      // First sort by starred status
      if (starredRepos.has(a.id) && !starredRepos.has(b.id)) return -1;
      if (!starredRepos.has(a.id) && starredRepos.has(b.id)) return 1;
      
      // Then sort by the selected sort option
      if (sortBy === 'lastUpdated') {
        const dateA = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0;
        const dateB = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === 'name') {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'owner') {
        const ownerA = a.owner || '';
        const ownerB = b.owner || '';
        return ownerA.localeCompare(ownerB);
      }
      
      return 0;
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredRepositories.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRepositories = filteredRepositories.slice(indexOfFirstItem, indexOfLastItem);
  
  // Debug filtering and pagination
  console.log('[RepositoriesPage] Filtered repositories:', {
    originalCount: repoArray.length,
    filteredCount: filteredRepositories.length,
    currentPage,
    totalPages,
    currentCount: currentRepositories.length,
    filters: {
      searchQuery,
      activeTab,
      filterCategory,
      sortBy
    }
  });

  // Handle page change
  const handlePageChange = (pageNumber: number): void => {
    setCurrentPage(pageNumber);
  };

  // Render repository cards
  const renderRepositoryCards = (): React.ReactNode => {
    
    // Only show loading state during initial data fetch
    // This prevents the skeleton from showing when filtering
    if (isLoading && repositories?.length === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-48 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3 mb-6"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Show empty state when we have repositories but none match the filter
    if (filteredRepositories.length === 0) {
      // Customize the message based on which filter is active
      let emptyStateMessage = '';
      if (searchQuery) {
        emptyStateMessage = t('noRepositoriesMatchingSearch', { fallback: 'No repositories match your search criteria.' });
      } else if (activeTab === 'starred') {
        emptyStateMessage = t('noStarredRepositories', { fallback: 'You haven\'t starred any repositories yet.' });
      } else if (activeTab === 'public') {
        emptyStateMessage = t('noPublicRepositories', { fallback: 'No public repositories found.' });
      } else if (activeTab === 'private') {
        emptyStateMessage = t('noPrivateRepositories', { fallback: 'No private repositories found.' });
      } else {
        emptyStateMessage = t('noRepositoriesYet', { fallback: 'No repositories found.' });
      }
      
      return (
        <div>
          <EmptyState
            icon={<GitBranch className="h-10 w-10" />}
            title={t('noRepositories')}
            description={emptyStateMessage}
            action={
              <Button onClick={() => setConnectDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addRepository')}
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentRepositories && currentRepositories.length > 0 ? (
            currentRepositories.map(repo => (
              <div
                key={repo.id}
                onClick={() => handleViewRepository(repo)}
                className="cursor-pointer"
              >
                <EnhancedRepositoryCard
                  repository={repo}
                  onSync={handleSyncRepository}
                  isSyncing={syncingRepoIds[repo.id] === true}
                  onToggleStarred={handleToggleStarred}
                  isStarred={starredRepos.has(repo.id)}
                  onDelete={handleDeleteRepository}
                  isDeleting={isDeleting === repo.id}
                />
              </div>
            ))
          ) : (
            <div className="col-span-3 p-4 text-center bg-gray-50 rounded-md">
              <p className="text-gray-500">{t('noRepositoriesToDisplay', { fallback: 'No repositories available to display.' })}</p>
            </div>
          )}
        </div>
        
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </>
    );
  };

  // Select repository for viewing
  const handleViewRepository = (repo: Repository): void => {
    setSelectedRepository(repo);
    setIsExplorerView(true);
  };

  // Return to repositories list
  const handleBackToList = (): void => {
    setSelectedRepository(null);
    setIsExplorerView(false);
  };

  if (isExplorerView && selectedRepository) {
    return (
      <div className="container mx-auto py-6">
        <RepositoryExplorer 
          repository={selectedRepository} 
          onBack={handleBackToList} 
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title={t('repositories')} 
        description={t('repositories_description')}
      >
        <Button onClick={() => setConnectDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add_provider')}
        </Button>
      </PageHeader>

      <div className="mt-6">
      
        <Card className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>{t('repositoryExplorer')}</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastUpdated">{t('lastUpdated')}</SelectItem>
                    <SelectItem value="name">{t('name')}</SelectItem>
                    <SelectItem value="owner">{t('owner')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={handleRefreshAll} 
                  disabled={isRefreshingAll}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshingAll ? 'animate-spin' : ''}`} />
                  {t('refresh')}
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchRepositories')}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {REPOSITORY_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t('all')}</TabsTrigger>
                <TabsTrigger value="starred">
                  <Star className="h-4 w-4 mr-1" />
                  {t('starred')}
                </TabsTrigger>
                <TabsTrigger value="public">{t('public')}</TabsTrigger>
                <TabsTrigger value="private">{t('private')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab}>
                {renderRepositoryCards()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <EnhancedConnectRepositoryDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onSubmit={handleConnectRepository}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDeleteRepository')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t('deleteRepositoryWarning')}
          </DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={confirmDeleteRepository}>
              {t('deleteAction')}
            </Button>
            <Button variant="outline" onClick={cancelDeleteRepository}>
              {t('cancelAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}