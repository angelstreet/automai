import { getTranslations } from 'next-intl/server';

import { DashboardContent } from './_components/client/DashboardContent';

/**
 * Dashboard page using the simplified approach
 * TenantLayoutClient automatically wraps the content with FeaturePageContainer
 * Enhanced FeaturePageContainer automatically extracts metadata from pageMetadata prop
 */
export default async function DashboardPage() {
  // Get translations for title and description
  const t = await getTranslations('Dashboard');

  // With enhanced FeaturePageContainer, simply add pageMetadata prop
  // No need to modify the component to accept this prop - it's extracted automatically
  return (
    <DashboardContent 
      pageMetadata={{
        title: t('title'),
        description: t('description'),
        actions: null
      }} 
    />
  );
  
  // Alternative direct approach still works:
  // return (
  //   <FeaturePageContainer title={t('title')} description={t('description')} actions={null}>
  //     <DashboardContent />
  //   </FeaturePageContainer>
  // );
}