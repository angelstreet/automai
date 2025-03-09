'use client';

import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { Main } from '@/components/layout/Main';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('Projects');
  const projectId = params.id as string;
  const locale = params.locale as string;

  const handleBack = () => {
    router.push(`/${locale}/projects`);
  };

  return (
    <Main>
      <PageHeader 
        title={t('projectDetails')}
        description={t('viewAndManageProject')}
      />
      <div className="grid gap-8 mt-6">
        <ProjectDetail projectId={projectId} onBack={handleBack} />
      </div>
    </Main>
  );
} 