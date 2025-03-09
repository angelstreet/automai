import { redirect } from 'next/navigation';
import { locales } from '@/config';
import { getUser } from '@/lib/supabase/auth';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return await locales.map((locale) => ({ locale }));
}

export default async function Page({ params }: { params: { locale: string } }) {
  // Try to get the authenticated user
  const userResult = await getUser();
  
  // Use tenant_name if available, otherwise default to 'trial'
  const tenantName = userResult.success && userResult.data?.tenant_name 
    ? userResult.data.tenant_name 
    : 'trial';
  
  // Log for debugging
  console.log('Root page redirect using tenant:', tenantName);
  
  // Redirect to the appropriate tenant dashboard
  redirect(`/${params.locale}/${tenantName}/dashboard`);
}
