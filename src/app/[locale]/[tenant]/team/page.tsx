import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getUser } from '@/app/actions/userAction';
import {  mapAuthUserToUser  } from '@/types/component/userComponentType';

import TeamHeader from './_components/TeamHeader';
import TeamOverviewSkeleton from './_components/TeamOverviewSkeleton';
import TeamSkeleton from './_components/TeamSkeleton';
import TeamActionsClient from './_components/client/TeamActionsClient';
import TeamTabsClient from './_components/client/TeamTabsClient';

// Wrapper component that accepts pageMetadata
function TeamContent({ user, pageMetadata }) {
  return (
    <Suspense fallback={<TeamSkeleton />}>
      {/* TeamHeader gets details from TeamContext */}
      <TeamHeader user={user} />
      <Suspense fallback={<TeamOverviewSkeleton />}>
        <TeamTabsClient user={user} />
      </Suspense>
    </Suspense>
  );
}

export default async function TeamPage() {
  const t = await getTranslations('team');

  // Get the user from auth
  const authUser = await getUser();
  const user = authUser ? mapAuthUserToUser(authUser) : null;

  // Using the simplified pattern with pageMetadata
  return (
    <TeamContent 
      user={user}
      pageMetadata={{
        title: t('title'),
        description: t('description'),
        actions: <TeamActionsClient />
      }}
    />
  );
}

// Add dynamic property to the component
TeamPage.dynamic = 'force-dynamic';
