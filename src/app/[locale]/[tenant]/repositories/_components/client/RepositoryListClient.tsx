'use client';

import { ChevronLeft, ChevronRight, GitBranch, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRepository } from '@/hooks/useRepository';
import { Repository } from '@/types/component/repositoryComponentType';

import { RepositoryCardClient } from './RepositoryCardClient';

export function RepositoryListClient() {
  const t = useTranslations('repositories');

  // Use the repository hook to get data
  const { repositories, isLoadingRepositories, refetchRepositories } = useRepository();

  // Dispatch event when repository count changes
  useEffect(() => {
    console.log('[RepositoryListClient] Repository count changed:', repositories.length);
    window.dispatchEvent(
      new CustomEvent('repository-count-updated', {
        detail: { count: repositories.length },
      }),
    );
  }, [repositories.length]);

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

  // UI state
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, _setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 12;

  const handleViewRepository = (repo: Repository) => {
    window.dispatchEvent(
      new CustomEvent('repository-view-request', {
        detail: { repo },
      }),
    );
  };

  // Filter repositories
  const filteredRepositories = repositories.filter((repo: Repository) => {
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
    if (activeTab === 'public' && repo.isPrivate === true) return false;
    if (activeTab === 'private' && repo.isPrivate !== true) return false;
    // We no longer have starring functionality
    if (activeTab === 'starred') return false;

    return true;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredRepositories.length / itemsPerPage);
  const currentRepositories = filteredRepositories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div>
      {/* Tabs filter and search */}
      <div className="flex justify-between items-center py-4 mb-4 relative">
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <Tabs
            defaultValue="all"
            value={activeTab}
            onValueChange={setActiveTab}
            className="pointer-events-auto"
          >
            <TabsList className="grid grid-cols-3 min-w-[400px]">
              <TabsTrigger value="all">{t('sort_all')}</TabsTrigger>
              <TabsTrigger value="public">{t('sort_public')}</TabsTrigger>
              <TabsTrigger value="private">{t('sort_private')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="invisible">
          <div className="w-[300px]" />
        </div>
      </div>

      {/* Repository cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoadingRepositories ? (
          <div className="col-span-full flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : currentRepositories.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<GitBranch className="h-10 w-10" />}
              title={t('none')}
              description={searchQuery ? t('none_matching_search') : t('none_yet')}
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
            <div
              key={repo.id}
              onClick={() => handleViewRepository(repo)}
              className="cursor-pointer"
            >
              <RepositoryCardClient repository={repo} isDeleting={isDeleting === repo.id} />
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
