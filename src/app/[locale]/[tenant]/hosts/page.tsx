import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getHosts } from '@/app/actions/hostsAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

// Import from barrel file instead of direct paths
import { HostContent, HostSkeleton, HostActionsClient, HostEventListener } from './_components';

export default async function HostsPage() {
  const t = await getTranslations('hosts');

  // Fetch initial hosts to get count
  const hostsResponse = await getHosts();
  const hosts = hostsResponse.success ? hostsResponse.data || [] : [];
  const hostCount = hosts.length;

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('desc')}
      actions={<HostActionsClient hostCount={hostCount} />}
    >
      {/* Event listener component for handling refresh and view toggling events */}
      <HostEventListener />

      <Suspense fallback={<HostSkeleton hostCount={hostCount} />}>
        <HostContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
