import { Suspense } from 'react';
import { getTeamDetails, getUnassignedResources } from './actions';
import TeamHeader from './_components/TeamHeader';
import TeamOverview from './_components/TeamOverview';
import { MembersTab } from './_components/client/MembersTab';
import { ResourcesTab } from './_components/client/ResourcesTab';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import TeamTabs from './_components/client/TeamTabs';

export const dynamic = 'force-dynamic';

export default async function TeamPage({ searchParams }: { searchParams: { tab?: string } }) {
  const activeTab = (await searchParams).tab || 'overview';
  const teamDetails = await getTeamDetails();
  const unassignedResources = await getUnassignedResources();

  return (
    <div className="container px-4 py-6 mx-auto space-y-8">
      <Suspense fallback={<LoadingSpinner />}>
        <TeamHeader team={teamDetails} activeTab={activeTab} />

        <TeamTabs
          activeTab={activeTab}
          teamDetails={teamDetails}
          unassignedResources={unassignedResources}
        />
      </Suspense>
    </div>
  );
}
