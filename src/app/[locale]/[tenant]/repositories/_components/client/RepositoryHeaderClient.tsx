'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Input } from '@/components/shadcn/input';

interface RepositoryHeaderProps {
  repositoryCount: number;
}

export function RepositoryHeaderClient({ repositoryCount }: RepositoryHeaderProps) {
  const t = useTranslations('repositories');
  const [searchQuery, setSearchQuery] = useState('');

  if (repositoryCount === 0) {
    return null;
  }

  return (
    <div className="relative w-[300px]">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={t('search_placeholder')}
        className="pl-8"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
