'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  GitBranch,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
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

import {
  RepositoryList,
  RepositoryHeader,
  RepositoryDialogs,
} from './_components';

// Import the repository context provider and hook
import { RepositoryContextProvider, useRepository } from '@/context';

// Create separate component for the page content (inside the provider)
function RepositoryPageContent() {
  const { toast } = useToast();
  const t = useTranslations('repositories');

  // Use the repository context
  const repositoryContext = useRepository();
  const {
    repositories = [],
    loading = false,
    error = null,
    starredRepositories = [],
    fetchRepositories,
    toggleStarRepository
  } = repositoryContext || {};

  // Track initialization separately
  const [initializing, setInitializing] = useState(true);
  
  // Track only necessary UI state
  const [starredRepos, setStarredRepos] = useState<Set<string>>(() => {
    // Initialize from context's starredRepositories
    const initialStarred = new Set<string>();
    if (starredRepositories) {
      starredRepositories.forEach((repo) => {
        if (repo && repo.id) initialStarred.add(repo.id);
      });
    }
    return initialStarred;
  });
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('lastUpdated');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [connectDialogOpen, setConnectDialogOpen] = useState<boolean>(false);
  const [isExplorerView, setIsExplorerView] = useState<boolean>(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState<boolean>(false);
  const [syncingRepoIds, setSyncingRepoIds] = useState<Record<string, boolean>>({});
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [repositoryToDelete, setRepositoryToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  // Refresh repositories on mount
  useEffect(() => {
    // Only fetch if we don't already have repositories
    if (!repositories || repositories.length === 0) {
      console.log('[RepositoriesPage] No repositories found, triggering fetch');
      fetchRepositories?.();
    } else {
      console.log('[RepositoriesPage] Repositories already loaded:', repositories.length);
    }
    
    // Set initializing to false after a short delay
    const initTimeout = setTimeout(() => {
      console.log('[RepositoriesPage] Initialization complete');
      setInitializing(false);
    }, 500);
    
    return () => clearTimeout(initTimeout);
  }, []); 

  // Update starredRepos when starredRepositories change in context
  useEffect(() => {
    if (starredRepositories && starredRepositories.length > 0) {
      const newStarred = new Set<string>();
      starredRepositories.forEach((repo) => {
        if (repo && repo.id) newStarred.add(repo.id);
      });
      setStarredRepos(newStarred);
    }
  }, [starredRepositories]);

  // Listen for open connect dialog events (used by EmptyState in RepositoryList)
  useEffect(() => {
    const handleOpenConnectDialog = () => setConnectDialogOpen(true);
    document.addEventListener('open-connect-dialog', handleOpenConnectDialog);
    return () => document.removeEventListener('open-connect-dialog', handleOpenConnectDialog);
  }, []);

  // Handle repository operations
  const handleToggleStarred = async (id: string): Promise<void> => {
    // Optimistic UI update
    setStarredRepos((prev) => {
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

    const repository = repositories.find((repo) => repo.id === id);
    if (!repository) {
      console.error('Repository not found for ID:', id);
      return;
    }

    // Call context method to toggle star
    try {
      // Call the toggleStarRepository method from context
      if (toggleStarRepository) {
        toggleStarRepository(repository);
      } else {
        console.error('Repository context does not have toggleStarRepository method');
      }
    } catch (error: unknown) {
      console.error('Error updating starred status:', error);

      // Revert the optimistic update on error
      setStarredRepos((prev) => {
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
    if (isRefreshingAll || !repositories || repositories.length === 0) {
      return;
    }

    setIsRefreshingAll(true);

    try {
      // Import the required actions dynamically
      const { testGitRepository, updateRepository, clearRepositoriesCache } = await import('./actions');

      // Process each repository one by one
      for (const repo of repositories) {
        if (!repo.url) continue;
        
        setSyncingRepoIds((prev) => ({ ...prev, [repo.id]: true }));
        
        try {
          // Test repository connectivity
          const testData = {
            url: repo.url,
            token: repo.provider?.access_token || '',
          };
          
          const result = await testGitRepository(testData);
          
          // Update repository status based on test result
          if (repo.id) {
            let newSyncStatus: 'SYNCED' | 'ERROR' | 'IDLE' = 'IDLE';
            
            if (result.success) {
              newSyncStatus = 'SYNCED';
            } else if (result.error || [404, 401, 403].includes(result.status || 0)) {
              newSyncStatus = 'ERROR';
            }
            
            // Update the repository status
            await updateRepository(repo.id, {
              sync_status: newSyncStatus,
              last_synced_at: new Date().toISOString(),
            });
            
            // Clear this repository's cache
            await clearRepositoriesCache({ repositoryId: repo.id });
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error refreshing repository ${repo.id}:`, error);
        } finally {
          setSyncingRepoIds((prev) => ({ ...prev, [repo.id]: false }));
        }
      }
      
      // Clear all repositories cache and refresh the list
      await clearRepositoriesCache();
      await fetchRepositories?.();
    } catch (error) {
      console.error('Error refreshing repositories:', error);
    } finally {
      setIsRefreshingAll(false);
      setSyncingRepoIds({});
    }
  };

  // Handle single repository sync
  const handleSyncRepository = async (id: string): Promise<void> => {
    if (!id) return;

    try {
      setSyncingRepoIds((prev) => ({ ...prev, [id]: true }));

      // Import needed functions
      const { testGitRepository, updateRepository, clearRepositoriesCache } = await import('./actions');

      // Find repository
      const repo = repositories?.find((r) => r.id === id);
      if (!repo || !repo.url) return;

      // Test connectivity
      const testData = {
        url: repo.url,
        token: repo.provider?.access_token || '',
      };

      const result = await testGitRepository(testData);
      
      // Update status based on test result
      if (repo.id) {
        let newSyncStatus: 'SYNCED' | 'ERROR' | 'IDLE' = 'IDLE';
        
        if (result.success) {
          newSyncStatus = 'SYNCED';
        } else if (result.error || [404, 401, 403].includes(result.status || 0)) {
          newSyncStatus = 'ERROR';
        }
        
        // Update the repository in DB
        await updateRepository(repo.id, {
          sync_status: newSyncStatus,
          last_synced_at: new Date().toISOString(),
        });
        
        // Clear repository cache
        await clearRepositoriesCache({ repositoryId: id });
      }
      
      // Refresh repositories
      await fetchRepositories?.();
    } catch (error) {
      console.error('Error syncing repository:', error);
    } finally {
      setSyncingRepoIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Handle repository connection
  const handleConnectRepository = async (values: ConnectRepositoryValues): Promise<void> => {
    try {
      // Connect repository via API
      const connectResponse = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!connectResponse.ok) {
        const errorData = await connectResponse.json();
        throw new Error(errorData.error || 'Failed to connect repository');
      }

      // Refresh repositories after connection
      await fetchRepositories?.();

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
      // Delete the repository via API
      const response = await fetch(`/api/repositories/${repositoryToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete repository');
      }

      // Refresh repositories after deletion
      await fetchRepositories?.();

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

  // Handle view repository - simplify using single selectedRepo state
  const handleViewRepository = (repo: Repository): void => {
    setSelectedRepo(repo);
    setIsExplorerView(true);
  };

  // Handle back to list
  const handleBackToList = (): void => {
    setSelectedRepo(null);
    setIsExplorerView(false);
  };

  // Render repository explorer or list
  if (isExplorerView && selectedRepo) {
    return (
      <div className="container mx-auto py-6">
        <RepositoryExplorer repository={selectedRepo} onBack={handleBackToList} />
      </div>
    );
  }

  // Render main repository page
  return (
    <div className="container mx-auto py-6">
      <PageHeader title={t('repositories')} description={t('repositories_description')}>
        <Button onClick={() => setConnectDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add_provider')}
        </Button>
      </PageHeader>

      <div className="mt-6">
        <Card className="w-full">
          <RepositoryHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            isRefreshingAll={isRefreshingAll}
            onRefreshAll={handleRefreshAll}
            onOpenConnectDialog={() => setConnectDialogOpen(true)}
          />

          <CardContent className="pt-4">
            <RepositoryList
              repositories={repositories}
              starredRepos={starredRepos}
              syncingRepoIds={syncingRepoIds}
              isDeleting={isDeleting}
              initializing={initializing}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onToggleStarred={handleToggleStarred}
              onSyncRepository={handleSyncRepository}
              onDeleteRepository={handleDeleteRepository}
              onViewRepository={handleViewRepository}
              searchQuery={searchQuery}
              filterCategory={filterCategory}
              sortBy={sortBy}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      </div>

      <RepositoryDialogs
        connectDialogOpen={connectDialogOpen}
        setConnectDialogOpen={setConnectDialogOpen}
        onConnectRepository={handleConnectRepository}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        onConfirmDelete={confirmDeleteRepository}
        onCancelDelete={cancelDeleteRepository}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// Main exported page component that wraps the content with the provider
export default function EnhancedRepositoryPage() {
  return (
    <RepositoryContextProvider>
      <RepositoryPageContent />
    </RepositoryContextProvider>
  );
}