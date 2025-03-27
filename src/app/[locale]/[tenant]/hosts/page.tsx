import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import HostContent from './_components/HostContent';
import HostSkeleton from './_components/HostSkeleton';
import { HostActions } from './_components/client/HostActions';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

export default async function HostsPage() {
  const t = await getTranslations('hosts');

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
