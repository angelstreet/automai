import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import MembersTabSkeleton from './_components/MembersTabSkeleton';
import OverviewTabSkeleton from './_components/OverviewTabSkeleton';
import TeamHeader from './_components/TeamHeader';
import TeamSkeleton from './_components/TeamSkeleton';
import { MembersTab } from './_components/client/MembersTab';
import TeamTabs from './_components/client/TeamTabs';
import { getTeamDetails, getUnassignedResources } from './actions';

export default async function TeamPage({ searchParams }: { searchParams: { tab?: string } }) {
  const t = await getTranslations('team');

  // The correct way to handle searchParams in Next.js 14+
  const { tab = 'overview' } = searchParams;

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
        <TeamHeader team={teamDetails} activeTab={tab} />

        {tab === 'members' ? (
          <Suspense fallback={<MembersTabSkeleton />}>
            <MembersTab
              teamId={teamDetails?.id}
              userRole={teamDetails?.userRole}
              subscriptionTier={teamDetails?.subscription_tier}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<OverviewTabSkeleton />}>
            {/* Use the existing TeamTabs component for overview */}
            <TeamTabs
              activeTab="overview"
              teamDetails={teamDetails}
              unassignedResources={unassignedResources}
            />
          </Suspense>
        )}
      </Suspense>
    </FeaturePageContainer>
  );
}

// Add dynamic property to the component
TeamPage.dynamic = 'force-dynamic';
