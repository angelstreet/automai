import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import WidgetContent from './_components/WidgetContent';

export default async function WidgetPage() {
  const t = await getTranslations('widget');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
      <WidgetContent />
    </FeaturePageContainer>
  );
}
