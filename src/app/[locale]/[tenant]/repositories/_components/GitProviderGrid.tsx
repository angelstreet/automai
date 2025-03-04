'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/shadcn/button';
import { Badge } from '@/components/shadcn/badge';
import { GitProvider } from '@/types/repositories';

interface GitProviderGridProps {
  providers: GitProvider[];
  repositories: any[];
  selectedProviders: string[];
  onAddProvider: () => void;
  onEditProvider: (provider: GitProvider) => void;
  onDeleteProvider: (id: string) => void;
  onToggleProviderFilter: (providerName: string) => void;
  refreshingProviderId: string | null;
}

export function GitProviderGrid({
  providers,
  repositories,
  selectedProviders,
  onAddProvider,
  onEditProvider,
  onDeleteProvider,
  onToggleProviderFilter,
  refreshingProviderId
}: GitProviderGridProps) {
  const t = useTranslations('repositories');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('connectedProviders')}</h2>
        <Button onClick={onAddProvider} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('add_provider')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => {
          const repoCount = repositories.filter(repo => repo.providerId === provider.id).length;
          const providerColor = provider.type === 'github' ? '#24292e' : 
                               provider.type === 'gitlab' ? '#fc6d26' : 
                               provider.type === 'gitea' ? '#609926' : '#4285f4';
          
          return (
            <div
              key={provider.id}
              className="border rounded-lg overflow-hidden shadow-sm"
              style={{ borderLeft: `4px solid ${providerColor}` }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{provider.displayName}</h3>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {provider.type}
                    </p>
                  </div>
                  <Badge variant={provider.status === 'connected' ? 'secondary' : 'outline'}>
                    {provider.status === 'connected' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    {repoCount} repositories
                  </span>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={selectedProviders.includes(provider.displayName)}
                      onChange={() => onToggleProviderFilter(provider.displayName)}
                    />
                    <span className="text-xs text-muted-foreground">Filter</span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 