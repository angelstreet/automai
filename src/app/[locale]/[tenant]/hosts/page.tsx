import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { getHosts } from '@/app/actions/hosts';
import HostContent from './_components/HostContent';
import HostSkeleton from './_components/HostSkeleton';

export default async function HostsPage() {
  const t = await getTranslations('hosts');
  
  return (
    <div>
      <PageHeader title={t('hosts')} description={t('hosts_description')} />
      <Suspense fallback={<HostSkeleton />}>
        <HostContent />
      </Suspense>
    </div>
  );
}
