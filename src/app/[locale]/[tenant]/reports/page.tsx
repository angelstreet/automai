import { getTranslations } from 'next-intl/server';

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
  
  // Using pageMetadata that will be automatically extracted by FeaturePageContainer
  return (
    <ReportsContent 
      pageMetadata={{
        title: t('title'),
        description: t('description')
      }}
    />
  );
}
