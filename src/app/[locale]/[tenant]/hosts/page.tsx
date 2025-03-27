import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { getHosts } from '@/app/actions/hosts';
import HostContent from './_components/HostContent';
import HostSkeleton from './_components/HostSkeleton';
import { HostActions } from './_components/client/HostActions';

export default async function HostsPage() {
  const t = await getTranslations('hosts');

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col gap-4">
        <PageHeader title={t('hosts')} description={t('hosts_description')}>
          <HostActions />
        </PageHeader>
        <Suspense fallback={<HostSkeleton />}>
          <HostContent />
        </Suspense>
      </div>
    </div>
  );
}
