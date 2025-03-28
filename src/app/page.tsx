import { redirect } from 'next/navigation';

import { defaultLocale } from '@/config';

export default async function RootPage() {
  redirect(`/${defaultLocale}`);
}
