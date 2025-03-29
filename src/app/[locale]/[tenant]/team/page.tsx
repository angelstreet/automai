import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import OverviewTabSkeleton from './_components/OverviewTabSkeleton';
import TeamHeader from './_components/TeamHeader';
import TeamSkeleton from './_components/TeamSkeleton';
import TeamTabs from './_components/client/TeamTabs';
import { getTeamDetails, getUnassignedResources } from './actions';

export default async function TeamPage() {
  const t = await getTranslations('team');

  // Prefetch the team details once - this is important for caching
  const teamDetailsPromise = getTeamDetails();
  const teamDetails = await teamDetailsPromise;
  const unassignedResources = await getUnassignedResources();

  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('description')}
      actions={null} // No specific actions for team page
    >
      <Suspense fallback={<TeamSkeleton />}>
        <TeamHeader team={teamDetails} />

        <Suspense fallback={<OverviewTabSkeleton />}>
          <TeamTabs teamDetails={teamDetails} unassignedResources={unassignedResources} />
        </Suspense>
      </Suspense>
    </FeaturePageContainer>
  );
}

// Add dynamic property to the component
TeamPage.dynamic = 'force-dynamic';
