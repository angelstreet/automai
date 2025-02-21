import { redirect } from 'next/navigation';

export default function TenantRedirectPage({ params }: { params: { tenant: string; locale: string } }) {
  redirect(`/${params.locale}/${params.tenant}/dashboard`);
  return null; // not reached
} 