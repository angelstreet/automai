'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, Plus, RefreshCw, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { CardHeader, CardTitle } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';

import { REPOSITORY_CATEGORIES } from '../constants';

export function RepositoryHeader() {
  const t = useTranslations('repositories');
  const router = useRouter();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      // Refresh data by telling Next.js to revalidate the route
      router.refresh();

      // Wait a bit to give visual indication
      setTimeout(() => {
        setIsRefreshing(false);
      }, 800);
    } catch (error) {
      console.error('Error refreshing repositories:', error);
      setIsRefreshing(false);
    }
  };

  return (
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
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
              {REPOSITORY_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              // Client-side filtering
              // Since this is just UI state, we handle it client-side
            }}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}
