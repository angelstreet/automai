'use client';

import { RepositoryDetail } from '@/components/repositories/RepositoryDetail';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default function RepositoryPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('Repositories');
  const repositoryId = params.id as string;
  const tenant = params.tenant as string;
  const locale = params.locale as string;

  const handleBack = () => {
    router.push(`/${locale}/${tenant}/repositories`);
  };

  return (
    <DashboardShell>
      <DashboardHeader
        heading={t('repositoryDetails')}
        text={t('viewAndManageRepository')}
      />
      <div className="grid gap-8">
        <RepositoryDetail repositoryId={repositoryId} onBack={handleBack} />
      </div>
    </DashboardShell>
  );
} 