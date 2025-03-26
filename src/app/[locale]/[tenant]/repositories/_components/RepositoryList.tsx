import React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';

import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { EmptyState } from '@/components/layout/EmptyState';

import { EnhancedRepositoryCard } from './EnhancedRepositoryCard';
import { Repository } from '../types';

interface RepositoryListProps {
  repositories: Repository[];
  starredRepos: Set<string>;
  syncingRepoIds: Record<string, boolean>;
  isDeleting: string | null;
  initializing: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleStarred: (id: string) => Promise<void>;
  onSyncRepository: (id: string) => Promise<void>;
  onDeleteRepository: (id: string) => void;
  onViewRepository: (repo: Repository) => void;
  searchQuery: string;
  filterCategory: string;
  sortBy: string;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (pageNumber: number) => void;
}

export function RepositoryList({
  repositories,
  starredRepos,
  syncingRepoIds,
  isDeleting,
  initializing,
  activeTab,
  setActiveTab,
  onToggleStarred,
  onSyncRepository,
  onDeleteRepository,
  onViewRepository,
  searchQuery,
  filterCategory,
  sortBy,
  currentPage,
  itemsPerPage,
  onPageChange,
}: RepositoryListProps) {
  const t = useTranslations('repositories');

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

  // Extract empty state to a separate function
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
            <Button onClick={() => document.dispatchEvent(new CustomEvent('open-connect-dialog'))}>
              <GitBranch className="h-4 w-4 mr-2" />
              {t('addRepository')}
            </Button>
          }
        />
      </div>
    );
  };

  // SIMPLIFIED RENDER METHOD
  const renderRepositoryCards = (): React.ReactNode => {
    // Only show skeletons during initial loading state
    if (initializing) {
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

    // After initialization, show repositories if we have them
    // No repositories or filtered results
    if (!repositories?.length || !filteredRepositories.length) {
      return renderEmptyState();
    }

    // Show repository cards
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentRepositories.map((repo) => (
            <div key={repo.id} onClick={() => onViewRepository(repo)} className="cursor-pointer">
              <EnhancedRepositoryCard
                repository={repo}
                onSync={onSyncRepository}
                isSyncing={syncingRepoIds[repo.id] === true}
                onToggleStarred={onToggleStarred}
                isStarred={starredRepos.has(repo.id)}
                onDelete={onDeleteRepository}
                isDeleting={isDeleting === repo.id}
              />
            </div>
          ))}
        </div>

        {/* Pagination controls - fixed rendering */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
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
