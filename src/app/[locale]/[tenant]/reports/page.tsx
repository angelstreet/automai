import { getTranslations } from 'next-intl/server';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

// Simple component that doesn't need to handle pageMetadata internally
function ReportsContent() {
  return (
    <div className="p-4">
      <p>Reports will be available here.</p>
    </div>
  );
}

export default async function ReportsPage() {
  const t = await getTranslations('Reports');
  
  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('description')}
    >
      <ReportsContent />
    </FeaturePageContainer>
  );
}
