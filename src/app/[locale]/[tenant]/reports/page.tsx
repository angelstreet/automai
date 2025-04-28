import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getTeamPageData } from '@/app/actions/teamAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { ReportsContent } from './_components/ReportsContent';

export default async function ReportsPage() {
  const t = await getTranslations('reports');

  // Get team page data using the same approach as the team page
  const pageData = await getTeamPageData();

  if (!pageData.success) {
    console.error('Failed to load team data for reports page:', pageData.error);
  }

  const teamDetails =
    pageData.success && pageData.data && 'teamDetails' in pageData.data
      ? pageData.data.teamDetails
      : null;

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')}>
      <Suspense fallback={<div>Loading reports...</div>}>
        <ReportsContent
          teamDetails={
            (teamDetails?.team as import('@/types/context/teamContextType').Team) ?? null
          }
        />
      </Suspense>
    </FeaturePageContainer>
  );
}

// Add dynamic property to the component
ReportsPage.dynamic = 'force-dynamic';
