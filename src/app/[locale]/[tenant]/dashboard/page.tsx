import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { DashboardContent } from './_components/client/DashboardContent';

/**
 * Dashboard page using the simplified approach
 * Enhanced FeaturePageContainer automatically extracts metadata
 */
export default async function DashboardPage() {
  // Get translations for title and description
  const t = await getTranslations('Dashboard');

  // Direct approach since we need to debug the issue
  return (
    <FeaturePageContainer title={t('title')} description={t('description')} actions={null}>
      <DashboardContent />
    </FeaturePageContainer>
  );
}
