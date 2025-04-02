import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

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
          <TeamTabsClient user={user} />
        </Suspense>
      </Suspense>
    </FeaturePageContainer>
  );
}

// Add dynamic property to the component
TeamPage.dynamic = 'force-dynamic';
