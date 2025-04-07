import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getTeamPageData } from '@/app/actions/teamAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import TeamContentSkeleton from './_components/TeamContentSkeleton';
import TeamHeader from './_components/TeamHeader';
import TeamOverviewSkeleton from './_components/TeamOverviewSkeleton';
import TeamActionsClient from './_components/client/TeamActionsClient';
import TeamContentClient from './_components/client/TeamContentClient';

export default async function TeamPage() {
  const t = await getTranslations('team');

  // Get all team page data in a single optimized server action
  const pageData = await getTeamPageData();
  
  if (!pageData.success) {
    console.error('Failed to load team page data:', pageData.error);
  }
  
  const { user, teamDetails, teamMembers } = pageData.success ? pageData.data : { 
    user: null, 
    teamDetails: null, 
    teamMembers: [] 
  };

  // Using FeaturePageContainer directly like repositories page
  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('desc')}
      actions={<TeamActionsClient />}
    >
      <Suspense fallback={<TeamContentSkeleton />}>
        {/* TeamHeader gets details from TeamContext */}
        <TeamHeader />
        <Suspense fallback={<TeamOverviewSkeleton />}>
          <TeamContentClient 
            user={user} 
            teamDetails={teamDetails} 
            teamMembers={teamMembers} 
          />
        </Suspense>
      </Suspense>
    </FeaturePageContainer>
  );
}

// Add dynamic property to the component
TeamPage.dynamic = 'force-dynamic';
