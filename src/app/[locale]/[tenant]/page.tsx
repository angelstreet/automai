import { redirect } from 'next/navigation';

export default async function TenantPage({ params }: { params: Promise<{ locale: string; tenant: string }> }) {
  const { locale, tenant } = await params;
  redirect(`/${locale}/${tenant}/dashboard`);
}
