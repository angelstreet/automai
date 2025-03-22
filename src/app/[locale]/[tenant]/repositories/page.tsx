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
    fetchRepositories = async (): Promise<Repository[]> => { 
      console.log('Repository context not initialized'); 
      return [];
    },
    // Custom properties not in the official RepositoryContextType interface but used in our component
    starredRepositories,
    toggleStarRepository = (repo: Repository): void => { 
      console.log('Repository context not initialized'); 
    }
  } = (repositoryContext as any) || {};
  
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
      toggleStarRepository(repository);
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

  // Handle repository sync
  const handleSyncRepository = async (id: string): Promise<void> => {
    setSyncingRepoId(id);
    try {
      // Since we don't have a direct syncRepository function in the context,
      // we'll manually call the API endpoint
      const response = await fetch(`/api/repositories/${id}/sync`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync repository');
      }
      
      // Refresh repositories after sync
      await fetchRepositories();
      
      toast({
        title: 'Success',
        description: t('syncSuccess'),
      });
    } catch (error: unknown) {
      console.error('Error syncing repository:', error);
      toast({
        title: 'Error',
        description: t('syncFailed'),
        variant: 'destructive',
      });
    } finally {
      setSyncingRepoId(null);
    }
  };

  // Handle refreshing all repositories
  const handleRefreshAll = async (): Promise<void> => {
    setIsRefreshingAll(true);
    try {
      // Call the fetchRepositories method from context
      await fetchRepositories();
      
      toast({
        title: 'Success',
        description: t('refreshSuccess'),
      });
    } catch (error: unknown) {
      console.error('Error refreshing repositories:', error);
      toast({
        title: 'Error',
        description: t('refreshFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingAll(false);
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
    
    // Only show loading state if we have no repositories
    // This prevents the infinite loading issue
    if (isLoading && filteredRepositories.length === 0) {
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

    if (filteredRepositories.length === 0) {
      return (
        <div>
          <EmptyState
            icon={<GitBranch className="h-10 w-10" />}
            title={t('noRepositories')}
            description={searchQuery ? t('noRepositoriesMatchingSearch') : t('noRepositoriesYet')}
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
                  isSyncing={syncingRepoId === repo.id}
                  onToggleStarred={handleToggleStarred}
                  isStarred={starredRepos.has(repo.id)}
                  onDelete={handleDeleteRepository}
                  isDeleting={isDeleting === repo.id}
                />
              </div>
            ))
          ) : (
            <div className="col-span-3 p-4 text-center bg-gray-50 rounded-md">
              <p className="text-gray-500">No repositories available to display.</p>
              <p className="text-sm text-gray-400">Array exists but is empty.</p>
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