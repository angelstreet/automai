import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getUnassignedResources } from '@/app/actions/team';
import { getUser } from '@/app/actions/user';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import { mapAuthUserToUser } from '@/utils/user';

import OverviewTabSkeleton from './_components/OverviewTabSkeleton';
import TeamHeader from './_components/TeamHeader';
import TeamSkeleton from './_components/TeamSkeleton';
import TeamActions from './_components/client/TeamActions';
import TeamTabs from './_components/client/TeamTabs';

export default async function TeamPage() {
  const t = await getTranslations('team');

  // Get the user from auth
  const authUser = await getUser();
  const user = authUser ? mapAuthUserToUser(authUser) : null;

  // Only fetch unassigned resources - team details come from context
  const unassignedResources = await getUnassignedResources();

  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('description')}
      actions={<TeamActions />}
    >
      <Suspense fallback={<TeamSkeleton />}>
        {/* TeamHeader gets details from TeamContext */}
        <TeamHeader user={user} />
        <Suspense fallback={<OverviewTabSkeleton />}>
          <TeamTabs unassignedResources={unassignedResources} user={user} />
        </Suspense>
      </Suspense>
    </FeaturePageContainer>
  );
}

// Add dynamic property to the component
TeamPage.dynamic = 'force-dynamic';
