'use client';

import { ChevronLeft, ChevronRight, GitBranch, PlusCircle, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import {
  getStarredRepositories,
  starRepositoryAction,
  unstarRepositoryAction,
} from '@/app/actions/repositories';
import { EmptyState } from '@/components/layout/EmptyState';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

import { Repository } from '../../types';
import { EnhancedRepositoryCard } from '../EnhancedRepositoryCard';

interface ClientRepositoryListProps {
  initialRepositories: Repository[];
  initialStarredIds: string[];
}

export function ClientRepositoryList({
  initialRepositories,
  initialStarredIds,
}: ClientRepositoryListProps) {
  const t = useTranslations('repositories');

  // Local state
  const [repositories] = useState<Repository[]>(initialRepositories);
  const [starredIds, setStarredIds] = useState<string[]>(initialStarredIds);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, _setIsDeleting] = useState<string | null>(null);
  const [_loading, setLoading] = useState<boolean>(initialStarredIds.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 12;

  // Convert array to Set for faster lookup
  const starredRepos = new Set(starredIds);

  // Fetch starred repositories on client side
  useEffect(() => {
    const fetchStarredRepos = async () => {
      try {
        setLoading(true);
        const result = await getStarredRepositories();
        if (result.success && result.data) {
          const ids = result.data.map((repo: any) => repo.repository_id || repo.id);
          setStarredIds(ids);
        }
      } catch (error) {
        console.error('Error fetching starred repositories:', error);
      } finally {
        setLoading(false);
      }
    };

    if (initialStarredIds.length === 0) {
      fetchStarredRepos();
    }
  }, [initialStarredIds]);

  // Action handlers
  const handleToggleStarred = async (id: string) => {
    const isStarred = starredRepos.has(id);

    try {
      // Optimistic update
      const newStarredIds = isStarred
        ? starredIds.filter((repoId) => repoId !== id)
        : [...starredIds, id];

      setStarredIds(newStarredIds);

      // Call the appropriate server action
      if (isStarred) {
        await unstarRepositoryAction(id);
      } else {
        await starRepositoryAction(id);
      }
    } catch (error) {
      console.error('Error toggling star status:', error);
      setStarredIds(starredIds);
    }
  };

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
    if (activeTab === 'starred' && !starredRepos.has(repo.id)) return false;

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
            <TabsList className="grid grid-cols-4 min-w-[400px]">
              <TabsTrigger value="all">{t('all')}</TabsTrigger>
              <TabsTrigger value="public">{t('public')}</TabsTrigger>
              <TabsTrigger value="private">{t('private')}</TabsTrigger>
              <TabsTrigger value="starred">{t('starred')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="invisible">
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

      {/* Repository cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentRepositories.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<GitBranch className="h-10 w-10" />}
              title={t('noRepositories')}
              description={searchQuery ? t('noRepositoriesMatchingSearch') : t('noRepositoriesYet')}
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
        ) : (
          currentRepositories.map((repo) => (
            <div
              key={repo.id}
              onClick={() => handleViewRepository(repo)}
              className="cursor-pointer"
            >
              <EnhancedRepositoryCard
                repository={repo}
                onToggleStarred={handleToggleStarred}
                isStarred={starredRepos.has(repo.id)}
                isDeleting={isDeleting === repo.id}
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
