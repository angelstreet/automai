import { redirect } from 'next/navigation';
import { locales } from '@/config';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return await locales.map((locale) => ({ locale }));
}

export default async function Page({ params }: { params: { locale: string } }) {
  // Redirect to the trial tenant dashboard
  redirect(`/${params.locale}/trial/dashboard`);
}
