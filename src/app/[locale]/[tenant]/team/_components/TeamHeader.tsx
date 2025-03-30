'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { User } from '@/types/user';
import { TeamDetails } from '@/types/team';
import { useTeam } from '@/context/TeamContext';

export default function TeamHeader({ user }: { user?: User | null }) {
  const t = useTranslations('team');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Get team data from context instead of props
  const { activeTeam } = useTeam();

  // Treat activeTeam as TeamDetails - adjust as needed based on your type structure
  const team = activeTeam as unknown as TeamDetails;

  if (!team) {
    return (
      <div className="p-4 border rounded mb-4">
        <p>Loading team information...</p>
      </div>
    );
  }

  // Use role property from team data
  const _userRole = team.role || '';

  const _getRoleBadgeColor = (role: string) => {
    if (!role) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'member':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const _getInitials = (name: string) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  const handleTabChange = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`);
  };

  // Log the team data to debug
  console.log('TeamHeader received team:', JSON.stringify(team, null, 2));

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
