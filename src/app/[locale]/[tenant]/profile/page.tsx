import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getUser } from '@/app/actions/userAction';

import { ProfileContent, ProfileSkeleton } from './_components';

export default async function ProfilePage() {
  const userData = await getUser();
  const t = await getTranslations('Profile');
  
  // Using pageMetadata that will be automatically extracted by FeaturePageContainer
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent 
        user={userData}
        pageMetadata={{
          title: t('title'),
          description: t('description')
        }}
      />
    </Suspense>
  );
}
