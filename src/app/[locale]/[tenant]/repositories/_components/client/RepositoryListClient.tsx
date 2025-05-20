'use client';

import { ChevronLeft, ChevronRight, GitBranch, PlusCircle, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { getActiveWorkspace, getWorkspacesContainingItem } from '@/app/actions/workspaceAction';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRepository } from '@/hooks/useRepository';
import { Repository } from '@/types/component/repositoryComponentType';

import { RepositoryCardClient } from './RepositoryCardClient';
import { RepositoryExplorerClient } from './RepositoryExplorerClient';

export function RepositoryListClient() {
  const t = useTranslations('repositories');

  // Use the repository hook to get data
  const { repositories, isLoadingRepositories, refetchRepositories, disconnectRepository } =
    useRepository();

  // State for repository explorer
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [showExplorer, setShowExplorer] = useState(false);

  // UI state - Move these declarations up before they're used in useEffects
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, _setSearchQuery] = useState('');
  const itemsPerPage = 12;

  // Workspace filtering
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [filteredRepositories, setFilteredRepositories] = useState<Repository[]>([]);

  // Fetch active workspace and set up listener for workspace changes
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        // Get active workspace
        const workspaceResult = await getActiveWorkspace();
        if (workspaceResult.success) {
          setActiveWorkspace(workspaceResult.data || null);
        }
      } catch (error) {
        console.error('[@component:RepositoryListClient] Error fetching workspace data:', error);
      }
    };

    fetchWorkspaceData();

    // Listen for workspace change events
    const handleWorkspaceChange = () => {
      console.log('[@component:RepositoryListClient] Workspace change detected, refreshing data');
      fetchWorkspaceData();
    };

    // Add event listener for workspace changes
    window.addEventListener('WORKSPACE_CHANGED', handleWorkspaceChange);

    // Cleanup function
    return () => {
      window.removeEventListener('WORKSPACE_CHANGED', handleWorkspaceChange);
    };
  }, []);

  // Filter repositories by active workspace
  useEffect(() => {
    const filterByWorkspace = async () => {
      // Set initial filtered repositories based on basic filters (before workspace filtering)
      const initialFiltered = repositories.filter((repo: Repository) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const repoName = repo.name?.toLowerCase() || '';
          const repoOwner = repo.owner?.toLowerCase() || '';
          const repoDescription = repo.description?.toLowerCase() || '';

          if (
            !repoName.includes(query) &&
            !repoOwner.includes(query) &&
            !repoDescription.includes(query)
          ) {
            return false;
          }
        }

        // Filter by tab
        if (activeTab === 'public' && repo.is_private === true) return false;
        if (activeTab === 'private' && repo.is_private !== true) return false;
        // We no longer have starring functionality
        if (activeTab === 'starred') return false;

        return true;
      });

      if (activeWorkspace) {
        console.log(
          '[@component:RepositoryListClient] Filtering by active workspace:',
          activeWorkspace,
        );

        // Filter repositories using the workspaces array that comes directly from the database
        const filtered = initialFiltered.filter((repo) => {
          const repoWorkspaces = (repo as any).workspaces || [];
          return repoWorkspaces.includes(activeWorkspace);
        });

        setFilteredRepositories(filtered);
        console.log(
          `[@component:RepositoryListClient] Filtered to ${filtered.length} repositories in workspace using direct workspace data`,
        );
      } else {
        // If no active workspace, show all repositories
        setFilteredRepositories(initialFiltered);
        console.log(
          `[@component:RepositoryListClient] No active workspace, showing all ${initialFiltered.length} repositories`,
        );
      }
    };

    filterByWorkspace();
  }, [repositories, activeWorkspace, searchQuery, activeTab]);

  // Dispatch event when repository count changes
  useEffect(() => {
    console.log('[RepositoryListClient] Repository count changed:', repositories.length);
    window.dispatchEvent(
      new CustomEvent('repository-count-updated', {
        detail: { count: repositories.length },
      }),
    );
  }, [repositories.length]);

  // Debug log for repository data
  useEffect(() => {
    if (repositories.length > 0) {
      console.log('[RepositoryListClient] Debug repositories data:');
      repositories.forEach((repo) => {
        console.log(`- Repository: ${repo.name || 'unnamed'}`);
        console.log(`  provider_type: ${repo.provider_type || 'undefined'}`);
        console.log(`  default_branch: ${repo.default_branch || 'undefined'}`);
        console.log(`  All data:`, repo);
      });
    }
  }, [repositories]);

  // Handle refresh events
  useEffect(() => {
    const handleRefresh = async () => {
      console.log('[RepositoryListClient] Handling refresh repositories request');
      try {
        // Use the refetchRepositories function from the hook
        await refetchRepositories();
        console.log('[RepositoryListClient] Repositories refresh complete');
      } catch (error) {
        console.error('[RepositoryListClient] Error refreshing repositories:', error);
      } finally {
        // Signal that the refresh is complete
        window.dispatchEvent(new CustomEvent('refresh-repositories-complete'));
      }
    };

    window.addEventListener('refresh-repositories', handleRefresh);
    return () => window.removeEventListener('refresh-repositories', handleRefresh);
  }, [refetchRepositories]);

  const handleViewRepository = (repo: Repository) => {
    // Update state to show the explorer
    setSelectedRepository(repo);
    setShowExplorer(true);
  };

  const handleBackToList = () => {
    setSelectedRepository(null);
    setShowExplorer(false);
  };

  // Calculate pagination using filteredRepositories instead of calculating on the fly
  const totalPages = Math.ceil(filteredRepositories.length / itemsPerPage);
  const currentRepositories = filteredRepositories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Handle repository deletion
  const handleDeleteRepository = async (id: string) => {
    if (!id) return;

    setIsDeleting(id);
    try {
      await disconnectRepository(id);
      // Refresh will happen automatically via the hook's queryClient.invalidateQueries
    } catch (error) {
      console.error('[RepositoryListClient] Error deleting repository:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  // If explorer is shown, render it
  if (showExplorer && selectedRepository) {
    return <RepositoryExplorerClient repository={selectedRepository} onBack={handleBackToList} />;
  }

  // Otherwise render repository list
  return (
    <div>
      {/* Tabs filter and search */}
      <div className="flex justify-between items-center py-4 mb-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 min-w-[400px]">
            <TabsTrigger value="all">{t('sort_all')}</TabsTrigger>
            <TabsTrigger value="starred">
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1" />
                <span>{t('sort_starred')}</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="public">{t('sort_public')}</TabsTrigger>
            <TabsTrigger value="private">{t('sort_private')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto">{/* Empty div for spacing */}</div>
      </div>

      {/* Repository cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoadingRepositories ? (
          <div key="loading-spinner" className="col-span-full flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : currentRepositories.length === 0 ? (
          <div key="empty-state" className="col-span-full">
            <EmptyState
              icon={<GitBranch className="h-10 w-10" />}
              title={
                activeWorkspace && repositories.length > 0 ? t('none_in_workspace') : t('none')
              }
              description={
                activeWorkspace && repositories.length > 0
                  ? t('none_in_workspace_desc')
                  : searchQuery
                    ? t('none_matching_search')
                    : t('none_yet')
              }
              action={
                <Button
                  onClick={() => document.getElementById('add-repository-button')?.click()}
                  size="sm"
                  className="gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{t('add_button')}</span>
                </Button>
              }
            />
          </div>
        ) : (
          currentRepositories.map((repo: Repository) => (
            <div key={repo.id}>
              <RepositoryCardClient
                repository={repo}
                isDeleting={isDeleting === repo.id}
                onClick={() => handleViewRepository(repo)}
                onDelete={handleDeleteRepository}
              />
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="py-2 px-2">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
