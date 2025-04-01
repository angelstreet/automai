import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getUser } from '@/app/actions/userAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import { mapAuthUserToUser } from '@/types/user';

import TeamHeader from './_components/TeamHeader';
import TeamOverviewSkeleton from './_components/TeamOverviewSkeleton';
import TeamSkeleton from './_components/TeamSkeleton';
import TeamActionsClient from './_components/client/TeamActionsClient';
import TeamTabsClient from './_components/client/TeamTabsClient';

export default async function TeamPage() {
  const t = await getTranslations('team');

  // Get the user from auth
  const authUser = await getUser();
  const user = authUser ? mapAuthUserToUser(authUser) : null;

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
