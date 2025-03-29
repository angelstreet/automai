import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getUser } from '@/app/actions/user';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import { mapAuthUserToUser } from '@/utils/user';

import OverviewTabSkeleton from './_components/OverviewTabSkeleton';
import TeamHeader from './_components/TeamHeader';
import TeamSkeleton from './_components/TeamSkeleton';
import TeamTabs from './_components/client/TeamTabs';
import { getTeamDetails, getUnassignedResources } from './actions';

export default async function TeamPage() {
  const t = await getTranslations('team');

  // Get the user from auth
  const authUser = await getUser();
  const user = authUser ? mapAuthUserToUser(authUser) : null;

  // Prefetch the team details once - this is important for caching
  const teamDetailsPromise = getTeamDetails(user?.id);
  const teamDetails = await teamDetailsPromise;
  const unassignedResources = await getUnassignedResources();

  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('description')}
      actions={null} // No specific actions for team page
    >
      <Suspense fallback={<TeamSkeleton />}>
        <TeamHeader team={teamDetails} user={user} />
        <Suspense fallback={<OverviewTabSkeleton />}>
          <TeamTabs
            teamDetails={teamDetails}
            unassignedResources={unassignedResources}
            user={user}
          />
        </Suspense>
      </Suspense>
    </FeaturePageContainer>
  );
}

// Add dynamic property to the component
TeamPage.dynamic = 'force-dynamic';
