import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getHosts } from '@/app/actions/hostsAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { HostActions } from './_components/client/HostActions';
import HostContent from './_components/HostContent';
import HostSkeleton from './_components/HostSkeleton';

export default async function HostsPage() {
  const t = await getTranslations('hosts');

  // Fetch initial hosts to get count
  const hostsResponse = await getHosts();
  const hosts = hostsResponse.success ? hostsResponse.data || [] : [];
  const hostCount = hosts.length;

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer
      title={t('hosts')}
      description={t('hosts_description')}
      actions={<HostActions hostCount={hostCount} />}
    >
      <Suspense fallback={<HostSkeleton />}>
        <HostContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
