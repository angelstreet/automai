import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { HostActions } from './_components/client/HostActions';
import HostContent from './_components/HostContent';
import HostSkeleton from './_components/HostSkeleton';

export default async function HostsPage() {
  const t = await getTranslations('hosts');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer
      title={t('hosts')}
      description={t('hosts_description')}
      actions={<HostActions />}
    >
      <Suspense fallback={<HostSkeleton />}>
        <HostContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
