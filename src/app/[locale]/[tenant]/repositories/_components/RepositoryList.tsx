'use client';

import { ChevronLeft, ChevronRight, GitBranch, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { useRepository } from '@/context';
import { EmptyState } from '@/components/layout/EmptyState';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

import { Repository } from '../types';

import { EnhancedRepositoryCard } from './EnhancedRepositoryCard';

interface RepositoryListProps {
  repositories: Repository[];
  starredRepos: Set<string>;
  error?: string;
}

export function RepositoryList({ repositories, starredRepos, error }: RepositoryListProps) {
  const t = useTranslations('repositories');
  const router = useRouter();

  // Local state
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [syncingRepoIds, setSyncingRepoIds] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const itemsPerPage = 12;

  // Client-side search state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [filterCategory, setFilterCategory] = useState('All');

  // Get repository hooks
  const { syncRepository, refetchRepositories } = useRepository();

  // Action handlers
  const handleToggleStarred = async (id: string) => {
    // Check if repository is already starred
    const isStarred = starredRepos.has(id);

    try {
      // Optimistic update
      const newStarredRepos = new Set(starredRepos);
      if (isStarred) {
        newStarredRepos.delete(id);
      } else {
        newStarredRepos.add(id);
      }

      // TODO: Replace with hook function when star functionality is added to useRepository
      // For now, we'll just refresh the UI
      router.refresh();
    } catch (error) {
      console.error('Error toggling star status:', error);
    }
  };

  const handleSyncRepository = async (id: string) => {
    if (!id) return;

    try {
      setSyncingRepoIds((prev) => ({ ...prev, [id]: true }));

      // Use the sync function from the hook
      await syncRepository(id);
      
      // Refresh the repositories data
      await refetchRepositories();
      
      // Also refresh the UI
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
        <h3 className="mb-2 text-lg font-medium">Error loading repositories</h3>
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
            <Button
              onClick={() => document.getElementById('add-repository-button')?.click()}
              size="sm"
              className="gap-1"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t('addRepository')}</span>
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
          <div className="flex justify-center mt-6 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
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
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="all">{t('all')}</TabsTrigger>
        <TabsTrigger value="starred">
          <GitBranch className="h-4 w-4 mr-1" />
          {t('starred')}
        </TabsTrigger>
        <TabsTrigger value="public">{t('public')}</TabsTrigger>
        <TabsTrigger value="private">{t('private')}</TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab}>{renderRepositoryCards()}</TabsContent>
    </Tabs>
  );
}
