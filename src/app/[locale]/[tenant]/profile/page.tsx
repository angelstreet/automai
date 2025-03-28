import { Suspense } from 'react';
import { getUser } from '@/app/actions/user';
import { ProfileContent, ProfileSkeleton } from './_components';

export default async function ProfilePage() {
  // Fetch user data server-side
  const userData = await getUser();

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent user={userData} />
    </Suspense>
  );
}
