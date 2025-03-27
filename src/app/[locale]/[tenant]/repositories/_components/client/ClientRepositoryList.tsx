'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, GitBranch, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { EmptyState } from '@/components/layout/EmptyState';
import { Input } from '@/components/shadcn/input';

import { EnhancedRepositoryCard } from '../EnhancedRepositoryCard';
import { Repository } from '../../types';
import {
  clearRepositoriesCache,
  getStarredRepositories,
  starRepositoryAction,
  unstarRepositoryAction,
} from '@/app/actions/repositories';

interface ClientRepositoryListProps {
  initialRepositories: Repository[];
  initialStarredIds: string[];
}

export function ClientRepositoryList({ 
  initialRepositories, 
  initialStarredIds 
}: ClientRepositoryListProps) {
  const t = useTranslations('repositories');
  const router = useRouter();

  // Local state
  const [repositories, setRepositories] = useState<Repository[]>(initialRepositories);
  const [starredIds, setStarredIds] = useState<string[]>(initialStarredIds);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [syncingRepoIds, setSyncingRepoIds] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(initialStarredIds.length === 0);
  const itemsPerPage = 12;

  // Client-side search state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [filterCategory, setFilterCategory] = useState('All');

  // Convert array to Set for faster lookup
  const starredRepos = new Set(starredIds);

  // Fetch starred repositories on client side
  useEffect(() => {
    const fetchStarredRepos = async () => {
      try {
        setLoading(true);
        const result = await getStarredRepositories();
        if (result.success && result.data) {
          // Extract IDs from the starred repositories
          const ids = result.data.map((repo: any) => repo.repository_id || repo.id);
          setStarredIds(ids);
        }
      } catch (error) {
        console.error('Error fetching starred repositories:', error);
        // Continue with empty starred list
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we didn't get initial data
    if (initialStarredIds.length === 0) {
      fetchStarredRepos();
    }
  }, [initialStarredIds]);

  // Action handlers
  const handleToggleStarred = async (id: string) => {
    // Check if repository is already starred
    const isStarred = starredRepos.has(id);

    try {
      // Optimistic update
      const newStarredIds = isStarred 
        ? starredIds.filter(repoId => repoId !== id)
        : [...starredIds, id];
      
      setStarredIds(newStarredIds);

      // Call the appropriate server action
      if (isStarred) {
        await unstarRepositoryAction(id);
      } else {
        await starRepositoryAction(id);
      }

      // No need to refresh, we already updated the state optimistically
    } catch (error) {
      console.error('Error toggling star status:', error);
      // Revert the optimistic update if there was an error
      setStarredIds(starredIds);
    }
  };

  const handleSyncRepository = async (id: string) => {
    if (!id) return;

    try {
      setSyncingRepoIds((prev) => ({ ...prev, [id]: true }));

      // Call clearRepositoriesCache to refresh the data
      await clearRepositoriesCache();

      // Refresh the UI to show updated data
      router.refresh();
    } catch (error) {
      console.error('Error syncing repository:', error);
    } finally {
      setSyncingRepoIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteRepository = (id: string) => {
    // We'll dispatch an event to show a deletion confirmation dialog
    window.dispatchEvent(
      new CustomEvent('repository-delete-request', {
        detail: { id },
      }),
    );
  };

  const handleViewRepository = (repo: Repository) => {
    // Navigate to repository explorer or detail view
    window.dispatchEvent(
      new CustomEvent('repository-view-request', {
        detail: { repo },
      }),
    );
  };

  // Safely handle potentially undefined repositories array
  const repoArray = repositories || [];

  // Filter repositories
  const filteredRepositories = repoArray
    .filter((repo: Repository) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const repoName = repo.name ? repo.name.toLowerCase() : '';
        const repoOwner = repo.owner ? repo.owner.toLowerCase() : '';
        const repoDescription = repo.description ? repo.description.toLowerCase() : '';

        if (
          !repoName.includes(query) &&
          !repoOwner.includes(query) &&
          !repoDescription.includes(query)
        ) {
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

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <h3 className="mb-2 text-lg font-medium">{t('error_loading', { fallback: 'Error loading repositories' })}</h3>
        <p>{error}</p>
      </div>
    );
  }

  // Empty state
  const renderEmptyState = () => {
    // Customize the message based on which filter is active
    let emptyStateMessage = '';
    if (searchQuery) {
      emptyStateMessage = t('noRepositoriesMatchingSearch', {
        fallback: 'No repositories match your search criteria.',
      });
    } else if (activeTab === 'starred') {
      emptyStateMessage = t('noStarredRepositories', {
        fallback: "You haven't starred any repositories yet.",
      });
    } else if (activeTab === 'public') {
      emptyStateMessage = t('noPublicRepositories', {
        fallback: 'No public repositories found.',
      });
    } else if (activeTab === 'private') {
      emptyStateMessage = t('noPrivateRepositories', {
        fallback: 'No private repositories found.',
      });
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
            <Button onClick={() => document.getElementById('add-repository-button')?.click()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addRepository')}
            </Button>
          }
        />
      </div>
    );
  };

  // Repository cards
  const renderRepositoryCards = (): React.ReactNode => {
    // No repositories or filtered results
    if (!repositories?.length || !filteredRepositories.length) {
      return renderEmptyState();
    }

    // Show repository cards
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentRepositories.map((repo) => (
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
          ))}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      {/* Tabs filter and search */}
      <div className="flex justify-between items-center py-4 mb-4 relative">
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="pointer-events-auto">
            <TabsList className="grid grid-cols-4 min-w-[400px]">
              <TabsTrigger value="all">{t('all')}</TabsTrigger>
              <TabsTrigger value="public">{t('public')}</TabsTrigger>
              <TabsTrigger value="private">{t('private')}</TabsTrigger>
              <TabsTrigger value="starred">{t('starred')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="invisible">
          {/* Placeholder to maintain layout */}
          <div className="w-[300px]" />
        </div>

        <div className="relative w-[300px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchRepositories')}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Repository cards with pagination */}
      {renderRepositoryCards()}
    </div>
  );
} 