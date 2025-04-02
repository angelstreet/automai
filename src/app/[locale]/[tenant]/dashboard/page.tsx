import { getTranslations } from 'next-intl/server';

import { DashboardContent } from './_components/client/DashboardContent';

/**
 * Dashboard page using the simplified approach
 * TenantLayoutClient automatically wraps the content with FeaturePageContainer
 * Using pageMetadata prop to specify title and description
 */
export default async function DashboardPage() {
  // Get translations for title and description
  const t = await getTranslations('Dashboard');

  // In this implementation, we just return the component with pageMetadata
  // No need to manually wrap with FeaturePageContainer
  return (
    <DashboardContent 
      pageMetadata={{
        title: t('title'),
        description: t('description'),
        actions: null
      }} 
    />
  );

  // The old approach required manual wrapping:
  // return (
  //   <FeaturePageContainer title={t('title')} description={t('description')} actions={null}>
  //     <DashboardContent />
  //   </FeaturePageContainer>
  // );
}