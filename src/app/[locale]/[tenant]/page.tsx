import { redirect } from 'next/navigation';

export default function TenantPage({ params }: { params: { locale: string; tenant: string } }) {
  redirect(`/${params.locale}/${params.tenant}/dashboard`);
}
