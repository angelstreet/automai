'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/shadcn/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { useTeam } from '@/hooks/useTeam';
import { TeamDetails } from '@/types/context/teamContextType';

export default function TeamHeader() {
  const t = useTranslations('team');
  const c = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Get team data and loading state from context
  const { activeTeam, loading } = useTeam('TeamHeader');

  // Treat activeTeam as TeamDetails - adjust as needed based on your type structure
  const team = activeTeam as unknown as TeamDetails;

  const handleTabChange = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`);
  };

  // If loading, show skeleton tabs
  if (loading || !team) {
    return (
      <div className="space-y-6">
        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="overview" disabled>
              <Skeleton className="h-5 w-20" />
            </TabsTrigger>
            <TabsTrigger value="members" disabled>
              <Skeleton className="h-5 w-20" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="overview">{c('overview')}</TabsTrigger>
          <TabsTrigger value="members">{t('members_title')}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
