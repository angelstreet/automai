import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AuthRedirectPage({
  params,
}: {
  params: { locale: string };
}) {
  // Await params to get locale
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  
  // Get cookies and create Supabase client
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  // Check for existing session - the middleware has already handled token refresh
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // Get tenant from user metadata or default to 'trial'
    const tenant = session.user.user_metadata?.tenant_name || 'trial';
    const dashboardUrl = `/${locale}/${tenant}/dashboard`;
    
    // Redirect to dashboard
    redirect(dashboardUrl);
  } else {
    // No session found, redirect to login
    redirect(`/${locale}/login`);
  }
  
  // This should never be reached due to redirects above
  // But we'll show a loading UI in case there's a delay
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 text-foreground">
        <div className="flex items-center justify-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-primary animate-pulse"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <h2 className="text-2xl font-bold">Authenticating...</h2>
        </div>
        <p>Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}
