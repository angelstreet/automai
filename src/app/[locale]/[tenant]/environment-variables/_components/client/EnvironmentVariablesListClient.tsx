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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
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
  const [teamPage, setTeamPage] = useState(1);
  const [sharedPage, setSharedPage] = useState(1);
  const itemsPerPage = 10;

  // Filter variables based on search and type (team/shared)
  const filteredVariables = variables.filter((variable) => {
    // Apply text search
    return (
      searchQuery === '' ||
      variable.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (variable.description &&
        variable.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Split variables into team and shared
  const teamVariables = filteredVariables.filter((v) => !v.isShared);
  const sharedVariables = filteredVariables.filter((v) => v.isShared);

  // Sort variables
  const sortVariables = (vars: EnvironmentVariable[]) => {
    return [...vars].sort((a, b) => {
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
  };

  const sortedTeamVariables = sortVariables(teamVariables);
  const sortedSharedVariables = sortVariables(sharedVariables);

  const renderTable = (
    variables: EnvironmentVariable[],
    title: string,
    currentPage: number,
    setPage: (page: number) => void,
  ) => {
    const totalPages = Math.ceil(variables.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedVariables = variables.slice(startIndex, endIndex);

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="border rounded-md">
          <Table className="[&_tr]:h-7 [&_td]:py-1 [&_td]:px-2 [&_th]:py-1 [&_th]:px-2 [&_th]:h-7">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">{c('key')}</TableHead>
                <TableHead className="w-[30%]">{c('value')}</TableHead>
                <TableHead className="w-[8%] text-center">{c('shared')}</TableHead>
                <TableHead className="w-[8%] text-center">{c('visibility')}</TableHead>
                <TableHead className="w-[8%] text-center">{c('copy')}</TableHead>
                <TableHead className="w-[8%] text-center">{c('edit')}</TableHead>
                <TableHead className="w-[8%] text-center">{c('delete')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVariables.map((variable) => (
                <EnvironmentVariableItemClient
                  key={variable.id}
                  variable={variable}
                  onVariableUpdated={onVariableUpdated}
                  onVariableDeleted={onVariableDeleted}
                />
              ))}
              {paginatedVariables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    {t('no_data')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-2">
            <button
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {c('previous')}
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`px-3 py-1 text-sm rounded-md ${page === currentPage ? 'bg-primary text-white' : 'border'}`}
                  onClick={() => setPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {c('next')}
            </button>
          </div>
        )}
        <div className="text-sm text-muted-foreground text-right mt-2">
          {variables.length > 0 && (
            <div>
              {t('showing')}{' '}
              <Badge variant="outline" className="font-mono">
                {paginatedVariables.length}
              </Badge>{' '}
              {paginatedVariables.length === 1 ? t('variable_singular') : t('variable_plural')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
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

      {renderTable(sortedTeamVariables, t('team_variables'), teamPage, setTeamPage)}
      {renderTable(sortedSharedVariables, t('shared_variables'), sharedPage, setSharedPage)}

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
