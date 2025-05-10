import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

// Import from barrel file instead of direct paths
import { BrowserContent, BrowserSkeleton } from './_components';

export default async function HostsPage() {
  const t = await getTranslations('browser');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
      <Suspense fallback={<BrowserSkeleton />}>
        <BrowserContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
