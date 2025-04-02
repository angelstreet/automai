import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { HostActionsClient } from './_components/HostActionsClient';
import HostContent from './_components/HostContent';
import HostSkeleton from './_components/HostSkeleton';

export default async function HostsPage() {
  const t = await getTranslations('hosts');

  // Using pageMetadata that will be automatically extracted by FeaturePageContainer
  // No need to modify the HostContent component - it works automatically
  return (
    <Suspense fallback={<HostSkeleton />}>
      <HostContent 
        pageMetadata={{
          title: t('hosts'),
          description: t('hosts_description'),
          actions: <HostActionsClient />
        }}
      />
    </Suspense>
  );
}
