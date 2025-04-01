'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/shadcn/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { useTeam } from '@/context';
import { TeamDetails } from '@/types/context/team';
import { User } from '@/types/auth/user';

export default function TeamHeader({ user }: { user?: User | null }) {
  const t = useTranslations('team');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Get team data and loading state from context
  const { activeTeam, loading } = useTeam();

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
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="members">{t('membersTab.title')}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
