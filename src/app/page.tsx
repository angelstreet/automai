import { redirect } from 'next/navigation';

import { defaultLocale } from '@/config';

export const _dynamic = 'force-static';

export default async function RootPage() {
  redirect(`/${defaultLocale}/`);
}
