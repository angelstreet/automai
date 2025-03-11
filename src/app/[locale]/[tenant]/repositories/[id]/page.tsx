'use client';

import { RepositoryDetail } from '@/components/repositories/RepositoryDetail';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { Main } from '@/components/layout/Main';

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
    <Main>
      <PageHeader title={t('repositoryDetails')} description={t('viewAndManageRepository')} />
      <div className="grid gap-8 mt-6">
        <RepositoryDetail repositoryId={repositoryId} onBack={handleBack} />
      </div>
    </Main>
  );
}
