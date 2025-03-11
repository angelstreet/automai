'use client';

import { HostDetail } from '@/components/hosts/HostDetail';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { Main } from '@/components/layout/Main';

export default function HostPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('Hosts');
  const hostId = params.id as string;
  const tenant = params.tenant as string;
  const locale = params.locale as string;

  const handleBack = () => {
    router.push(`/${locale}/${tenant}/hosts`);
  };

  return (
    <Main>
      <PageHeader title={t('hostDetails')} description={t('viewAndManageHost')} />
      <div className="grid gap-8 mt-6">
        <HostDetail hostId={hostId} onBack={handleBack} />
      </div>
    </Main>
  );
}
