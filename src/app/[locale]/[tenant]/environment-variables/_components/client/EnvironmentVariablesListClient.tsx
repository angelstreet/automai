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
  const c = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // Default to newest first

  // Filter variables based on search
  const filteredVariables = variables.filter((variable) => {
    // Apply text search
    return (
      searchQuery === '' ||
      variable.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (variable.description &&
        variable.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search_placeholder')}
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px] h-9 text-xs whitespace-nowrap overflow-hidden">
              <SelectValue placeholder={t('sort_newest')} className="truncate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="key_asc" className="text-xs">
                {t('sort_key_asc')}
              </SelectItem>
              <SelectItem value="key_desc" className="text-xs">
                {t('sort_key_desc')}
              </SelectItem>
              <SelectItem value="newest" className="text-xs">
                {t('sort_newest')}
              </SelectItem>
              <SelectItem value="oldest" className="text-xs">
                {t('sort_oldest')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="">
              <TableHead className="w-1/3 text-xs">{t('key')}</TableHead>
              <TableHead className="w-1/3  text-xs">{t('value')}</TableHead>
              <TableHead className="w-24 text-center  text-xs">{c('visibility')}</TableHead>
              <TableHead className="w-12 text-center  text-xs">{c('copy')}</TableHead>
              <TableHead className="w-12 text-center  text-xs">{c('edit')}</TableHead>
              <TableHead className="w-12 text-center text-xs">{c('actions')}</TableHead>
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

      <div className="text-sm text-muted-foreground text-right">
        {filteredVariables.length === 0 ? (
          <div>{t('no_data')}</div>
        ) : (
          <div>
            {t('showing')}{' '}
            <Badge variant="outline" className="font-mono">
              {filteredVariables.length}
            </Badge>{' '}
            {filteredVariables.length === 1 ? t('variable_singular') : t('variable_plural')}
          </div>
        )}
      </div>
    </div>
  );
}
