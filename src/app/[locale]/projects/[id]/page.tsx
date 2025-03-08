'use client';

import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('Projects');
  const projectId = params.id as string;

  const handleBack = () => {
    router.push('/projects');
  };

  return (
    <DashboardShell>
      <DashboardHeader
        heading={t('projectDetails')}
        text={t('viewAndManageProject')}
      />
      <div className="grid gap-8">
        <ProjectDetail projectId={projectId} onBack={handleBack} />
      </div>
    </DashboardShell>
  );
} 