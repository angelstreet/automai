'use client';

import { HostDetail } from '@/components/hosts/HostDetail';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

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
    <DashboardShell>
      <DashboardHeader
        heading={t('hostDetails')}
        text={t('viewAndManageHost')}
      />
      <div className="grid gap-8">
        <HostDetail hostId={hostId} onBack={handleBack} />
      </div>
    </DashboardShell>
  );
} 