import React from 'react';
import { useTranslations } from 'next-intl';
import { Filter, Plus, RefreshCw, Search } from 'lucide-react';

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

interface RepositoryHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  isRefreshingAll: boolean;
  onRefreshAll: () => Promise<void>;
  onOpenConnectDialog: () => void;
}

export function RepositoryHeader({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  filterCategory,
  setFilterCategory,
  isRefreshingAll,
  onRefreshAll,
  onOpenConnectDialog,
}: RepositoryHeaderProps) {
  const t = useTranslations('repositories');

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
          <Button variant="outline" onClick={onRefreshAll} disabled={isRefreshingAll}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshingAll ? 'animate-spin' : ''}`} />
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
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}
