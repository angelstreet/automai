'use client';

import { useRouter, usePathname } from 'next/navigation';
import TeamOverview from '../TeamOverview';
import { MembersTab } from './MembersTab';
import { ResourcesTab } from './ResourcesTab';

interface TeamTabsProps {
  activeTab: string;
  teamDetails: any;
  unassignedResources: any;
}

export default function TeamTabs({ activeTab, teamDetails, unassignedResources }: TeamTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`);
  };

  return (
    <>
      {activeTab === 'overview' && (
        <TeamOverview team={teamDetails} unassignedResources={unassignedResources} />
      )}

      {activeTab === 'members' && <MembersTab teamId={teamDetails.id} />}

      {activeTab === 'resources' && (
        <ResourcesTab
          teamId={teamDetails.id}
          teamName={teamDetails.name}
          unassignedRepositories={unassignedResources.repositories || []}
          resourceCounts={teamDetails.resourceCounts}
        />
      )}
    </>
  );
}
