import { locales } from '@/config';

import { HomePage } from './_components/HomePage';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function Page() {
  return <HomePage />;
}
