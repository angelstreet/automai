import { redirect } from 'next/navigation';

import { defaultLocale } from '@/config';

export default async function RootPage() {
  console.log('Rendering RootPage, redirecting to', `/${defaultLocale}`);
  redirect(`/${defaultLocale}`);
}
