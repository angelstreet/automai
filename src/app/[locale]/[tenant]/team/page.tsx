import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getTeamDetails, getTeamResourceCounts } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import TeamHeader from './_components/TeamHeader';
import TeamOverviewSkeleton from './_components/TeamOverviewSkeleton';
import TeamSkeleton from './_components/TeamSkeleton';
import TeamActionsClient from './_components/client/TeamActionsClient';
import TeamTabsClient from './_components/client/TeamTabsClient';

export default async function TeamPage() {
  const t = await getTranslations('team');

  // Get the user from auth - it's already a User type, no need to map
  const user = await getUser();

  // Get team details including the tenant ID
  const teamDetailsResult = await getTeamDetails();
  const teamDetails = teamDetailsResult.success ? teamDetailsResult.data : null;
  const teamId = teamDetails?.team?.id;

  // Fetch resource counts directly if we have a team ID
  let resourceCounts = {
    repositories: 0,
    hosts: 0,
    cicd: 0,
    deployments: 0,
  };

  if (teamId) {
    // Use the team-specific function to get resources for this team
    const countsResult = await getTeamResourceCounts(teamId);
    if (countsResult.success && countsResult.data) {
      resourceCounts = {
        repositories: countsResult.data.repositories || 0,
        hosts: countsResult.data.hosts || 0,
        cicd: countsResult.data.cicdProviders || 0,
        deployments: countsResult.data.deployments || 0,
      };

      // Log the actual resource counts for debugging
      console.log('Server-side team resourceCounts:', resourceCounts);
      console.log('Raw team countsResult.data:', countsResult.data);
    }
  }

  // Using FeaturePageContainer directly like repositories page
  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('description')}
      actions={<TeamActionsClient />}
    >
      <Suspense fallback={<TeamSkeleton />}>
        {/* TeamHeader gets details from TeamContext */}
        <TeamHeader user={user} />
        <Suspense fallback={<TeamOverviewSkeleton />}>
          <TeamTabsClient user={user} resourceCounts={resourceCounts} />
        </Suspense>
      </Suspense>
    </FeaturePageContainer>
  );
}

// Add dynamic property to the component
TeamPage.dynamic = 'force-dynamic';
