import { Suspense } from 'react';
import { getTeamDetails, getUnassignedResources } from './actions';
import TeamOverview from './_components/TeamOverview';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const teamDetails = await getTeamDetails();
  const unassignedResources = await getUnassignedResources();

  return (
    <div className="container px-4 py-6 mx-auto space-y-8">
      <h1 className="text-2xl font-semibold flex items-center">
        Team Management
        {teamDetails.id && <span className="ml-2 text-muted-foreground">- {teamDetails.name}</span>}
      </h1>

      <Suspense fallback={<LoadingSpinner />}>
        <TeamOverview team={teamDetails} unassignedResources={unassignedResources} />
      </Suspense>
    </div>
  );
}
