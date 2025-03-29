import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

// Simple team content component
function TeamContent() {
  return (
    <div className="p-4">
      <p>Team management will be available here.</p>
    </div>
  );
}

// Simple loading skeleton
function TeamSkeleton() {
  return (
    <div className="p-4 w-full">
      <div className="h-8 bg-muted animate-pulse rounded w-1/4 mb-4"></div>
      <div className="h-32 bg-muted animate-pulse rounded"></div>
    </div>
  );
}

export default async function TeamPage() {
  const t = await getTranslations('team');

  return (
    <FeaturePageContainer
      title={t('title', { defaultValue: 'Team Management' })}
      description={t('description', { defaultValue: 'Manage teams, members, and resource limits' })}
      actions={<div />}
    >
      <Suspense fallback={<TeamSkeleton />}>
        <TeamContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
