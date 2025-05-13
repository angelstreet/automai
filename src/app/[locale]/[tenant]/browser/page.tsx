import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import BrowserContent from './_components/BrowserContent';

export default async function HostsPage() {
  const t = await getTranslations('browser');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
      <BrowserContent />
    </FeaturePageContainer>
  );
}
