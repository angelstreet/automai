'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Input } from '@/components/shadcn/input';

export function RepositoryHeader() {
  const t = useTranslations('repositories');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="relative w-[300px]">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={t('searchRepositories')}
        className="pl-8"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
