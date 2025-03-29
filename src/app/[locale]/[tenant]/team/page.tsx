import { Suspense } from 'react';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

import TeamHeader from './_components/TeamHeader';
import TeamTabs from './_components/client/TeamTabs';
import { getTeamDetails, getUnassignedResources } from './actions';

export default async function TeamPage({ searchParams }: { searchParams: { tab?: string } }) {
  // Use Promise.resolve to await searchParams
  const params = await Promise.resolve(searchParams);
  const activeTab = params.tab || 'overview';

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

// Add dynamic property to the component
TeamPage.dynamic = 'force-dynamic';
