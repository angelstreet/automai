import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getUser } from '@/app/actions/userAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { ProfileContent, ProfileSkeleton } from './_components';

export default async function ProfilePage() {
  const userData = await getUser();
  const t = await getTranslations('profile');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('description')}>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent user={userData} />
      </Suspense>
    </FeaturePageContainer>
  );
}
