import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Reports for your deployments',
};

// Simple reports content component
function ReportsContent() {
  return (
    <div className="p-4">
      <p>Reports will be available here.</p>
    </div>
  );
}

// Simple loading skeleton
function ReportsSkeleton() {
  return (
    <div className="p-4 w-full">
      <div className="h-8 bg-muted animate-pulse rounded w-1/4 mb-4"></div>
      <div className="h-32 bg-muted animate-pulse rounded"></div>
    </div>
  );
}

export default async function ReportsPage() {
  const t = await getTranslations('Reports');
  
  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('description')}
      // Empty actions for now
      actions={<div />}
    >
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
