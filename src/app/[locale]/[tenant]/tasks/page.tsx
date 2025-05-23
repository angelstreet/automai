import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import TasksContent from './_components/TasksContent';

export default async function TasksPage() {
  const t = await getTranslations('tasks');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
      <TasksContent />
    </FeaturePageContainer>
  );
}
