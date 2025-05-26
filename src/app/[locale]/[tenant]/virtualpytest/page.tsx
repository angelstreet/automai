import { getTranslations } from 'next-intl/server';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

export default async function VirtualPyTestPage() {
  const t = await getTranslations('virtualpytest');

  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('desc')}
    >
    </FeaturePageContainer>
  );
}
