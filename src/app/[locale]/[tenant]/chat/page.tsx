import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import ChatContent from './_components/ChatContent';

export default async function BrowserPage() {
  const t = await getTranslations('chat');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
      <ChatContent />
    </FeaturePageContainer>
  );
}
