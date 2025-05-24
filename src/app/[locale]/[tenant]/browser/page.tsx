import { getTranslations } from 'next-intl/server';

import { getHosts } from '@/app/actions/hostsAction';
import { getUser } from '@/app/actions/userAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import BrowserContent from './_components/BrowserContent';
import { BrowserActionsClient } from './_components/client/BrowserActionsClient';

export default async function BrowserPage() {
  const t = await getTranslations('browser');

  // Get user for profile_id
  const user = await getUser();

  if (!user) {
    return (
      <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
        <div className="p-4">
          <div className="text-center text-red-500">Authentication required</div>
        </div>
      </FeaturePageContainer>
    );
  }

  // Get hosts for the team (team is determined automatically in the action)
  const hostsResult = await getHosts();

  if (!hostsResult.success) {
    return (
      <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
        <div className="p-4">
          <div className="text-center text-red-500">Error loading hosts: {hostsResult.error}</div>
        </div>
      </FeaturePageContainer>
    );
  }

  const hosts = hostsResult.data || [];

  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('desc')}
      actions={<BrowserActionsClient initialHosts={hosts} currentUser={user} />}
    >
      <BrowserContent />
    </FeaturePageContainer>
  );
}
