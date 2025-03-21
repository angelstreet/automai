'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { GitBranch, Plus, RefreshCw, Search, Filter, Star, ChevronLeft, ChevronRight, Trash } from 'lucide-react';
import { useRepository } from '@/context';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Badge } from '@/components/shadcn/badge';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Separator } from '@/components/shadcn/separator';
import { Skeleton } from '@/components/shadcn/skeleton';
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
  const {
    repositories,
    loading: isLoading,
    error,
    fetchRepositories,
    starRepository,
    unstarRepository,
    syncRepository,
    refreshAllRepositories,
    deleteRepository
  } = useRepository();

  // State for UI
  const [starredRepos, setStarredRepos] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [filterCategory, setFilterCategory] = useState('All');
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [isExplorerView, setIsExplorerView] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [repositoryToDelete, setRepositoryToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // Fetch repositories using the context
    fetchRepositories();
    
    // Fetch starred repositories
    const loadStarredRepos = async () => {
      try {
        const starredResponse = await fetch('/api/repositories/starred');
        if (starredResponse.ok) {
          const starredResult = await starredResponse.json();
          if (starredResult.success && Array.isArray(starredResult.data)) {
            const starredIds = new Set<string>(starredResult.data.map((repo: any) => repo.repository_id as string));
            setStarredRepos(starredIds);
          }
        }
      } catch (error) {
        console.error('Error fetching starred repositories:', error);
      }
    };
    
    loadStarredRepos();
  }, [fetchRepositories]);

  // Handle repository starring/unstarring
  const handleToggleStarred = async (id: string) => {
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

    // Call API to update starred status using the context
    try {
      if (starredRepos.has(id)) {
        await unstarRepository(id);
      } else {
        await starRepository(id);
      }
    } catch (error) {
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
  const handleSyncRepository = async (id: string) => {
    setSyncingRepoId(id);
    try {
      // Call the context to sync the repository
      await syncRepository(id);
      
      toast({
        title: 'Success',
        description: t('syncSuccess'),
      });
    } catch (error) {
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
  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      // Use the context to refresh all repositories
      await refreshAllRepositories();
      
      toast({
        title: 'Success',
        description: t('refreshSuccess'),
      });
    } catch (error) {
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
  const handleConnectRepository = async (values: ConnectRepositoryValues) => {
    console.log('Connect repository:', values);
    
    try {
      setIsLoading(true);
      
      // After any repository connection, refresh the repositories list
      const response = await fetch('/api/repositories');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update repositories state
      if (Array.isArray(result)) {
        setRepositories(result);
      } else if (result.success && Array.isArray(result.data)) {
        setRepositories(result.data);
      }
      
      toast({
        title: 'Success',
        description: t('connectSuccess'),
      });
    } catch (error) {
      console.error('Error refreshing repositories after connection:', error);
      
      toast({
        title: 'Warning',
        description: 'Repository may have been added. Please refresh the page.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle repository deletion
  const handleDeleteRepository = async (id: string) => {
    setRepositoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRepository = async () => {
    if (!repositoryToDelete) return;
    
    setIsDeleting(repositoryToDelete);
    try {
      // Use the context to delete the repository
      await deleteRepository(repositoryToDelete);
      
      toast({
        title: 'Success',
        description: t('deleteSuccess'),
      });
      
      setDeleteDialogOpen(false);
    } catch (error) {
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

  const cancelDeleteRepository = () => {
    setDeleteDialogOpen(false);
    setRepositoryToDelete(null);
  };

  // Filter and sort repositories based on current UI state
  const filteredRepositories = repositories
    .filter(repo => {
      // Filter by search query
      if (searchQuery && !repo.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !repo.owner.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filter by tab
      if (activeTab === 'public' && repo.isPrivate) return false;
      if (activeTab === 'private' && !repo.isPrivate) return false;
      if (activeTab === 'starred' && !starredRepos.has(repo.id)) return false;
      
      // Filter by category
      if (filterCategory !== 'All') {
        // Implement category filtering logic here if needed
        return true;
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
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'owner') {
        return a.owner.localeCompare(b.owner);
      }
      
      return 0;
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredRepositories.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRepositories = filteredRepositories.slice(indexOfFirstItem, indexOfLastItem);

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Render repository cards
  const renderRepositoryCards = () => {
    if (isLoading) {
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
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentRepositories.map(repo => (
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
          ))}
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
  const handleViewRepository = (repo: Repository) => {
    setSelectedRepository(repo);
    setIsExplorerView(true);
  };

  // Return to repositories list
  const handleBackToList = () => {
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