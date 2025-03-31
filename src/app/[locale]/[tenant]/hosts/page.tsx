import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import HostContent from './_components/HostContent';
import HostSkeleton from './_components/HostSkeleton';
import { HostActionsClient } from './_components/HostActionsClient';

export default async function HostsPage() {
  const t = await getTranslations('hosts');

  return (
    <FeaturePageContainer
      title={t('hosts')}
      description={t('hosts_description')}
      actions={<HostActionsClient />}
    >
      <Suspense fallback={<HostSkeleton />}>
        <HostContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
