'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/shadcn/badge';
import { Input } from '@/components/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import { EnvironmentVariable } from '@/types/context/environmentVariablesContextType';

import { EnvironmentVariableItemClient } from './EnvironmentVariableItemClient';

interface EnvironmentVariablesListClientProps {
  variables: EnvironmentVariable[];
  onVariableUpdated?: (variable: EnvironmentVariable) => void;
  onVariableDeleted: (id: string) => void;
}

export function EnvironmentVariablesListClient({
  variables,
  onVariableUpdated = () => {},
  onVariableDeleted,
}: EnvironmentVariablesListClientProps) {
  const t = useTranslations('environmentVariables');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'secret', 'normal'
  const [sortBy, setSortBy] = useState('key_asc'); // 'key_asc', 'key_desc', 'newest', 'oldest'

  // Filter variables based on search and filter
  const filteredVariables = variables.filter((variable) => {
    // First apply text search
    const matchesSearch =
      searchQuery === '' ||
      variable.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (variable.description &&
        variable.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Then apply type filter
    if (filter === 'all') return matchesSearch;
    if (filter === 'secret') return matchesSearch && variable.is_secret;
    if (filter === 'normal') return matchesSearch && !variable.is_secret;

    return matchesSearch;
  });

  // Sort variables
  const sortedVariables = [...filteredVariables].sort((a, b) => {
    switch (sortBy) {
      case 'key_asc':
        return a.key.localeCompare(b.key);
      case 'key_desc':
        return b.key.localeCompare(a.key);
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search_placeholder')}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('filter_all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter_all')}</SelectItem>
              <SelectItem value="secret">{t('filter_secret')}</SelectItem>
              <SelectItem value="normal">{t('filter_normal')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('sort_key_asc')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="key_asc">{t('sort_key_asc')}</SelectItem>
              <SelectItem value="key_desc">{t('sort_key_desc')}</SelectItem>
              <SelectItem value="newest">{t('sort_newest')}</SelectItem>
              <SelectItem value="oldest">{t('sort_oldest')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">{t('key')}</TableHead>
              <TableHead className="w-1/3">{t('value')}</TableHead>
              <TableHead className="w-1/4">{t('description')}</TableHead>
              <TableHead className="w-24 text-center">{t('is_secret')}</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedVariables.map((variable) => (
              <EnvironmentVariableItemClient
                key={variable.id}
                variable={variable}
                onVariableUpdated={onVariableUpdated}
                onVariableDeleted={onVariableDeleted}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredVariables.length === 0 ? (
          <p>{t('no_data')}</p>
        ) : (
          <p>
            {t('showing')}{' '}
            <Badge variant="outline" className="font-mono">
              {filteredVariables.length}
            </Badge>{' '}
            {filteredVariables.length === 1 ? t('variable_singular') : t('variable_plural')}
          </p>
        )}
      </div>
    </div>
  );
}
