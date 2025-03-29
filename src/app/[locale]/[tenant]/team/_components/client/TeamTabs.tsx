'use client';

import TeamOverview from '../TeamOverview';

import { MembersTab } from './MembersTab';
import { ResourcesTab } from './ResourcesTab';

interface TeamTabsProps {
  activeTab: string;
  teamDetails: any;
  unassignedResources: any;
}

export default function TeamTabs({ activeTab, teamDetails, unassignedResources }: TeamTabsProps) {
  return (
    <>
      {activeTab === 'overview' && <TeamOverview unassignedResources={unassignedResources} />}

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
