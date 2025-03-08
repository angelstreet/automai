import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Chrome, Github } from 'lucide-react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';

// Server actions for authentication
async function signInWithPassword(formData: FormData) {
  'use server';
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const callbackUrl = formData.get('callbackUrl') as string || '';
  const locale = formData.get('locale') as string || 'en';
  
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    // Redirect back to login page with error
    return redirect(`/${locale}/login?error=${encodeURIComponent(error.message)}`);
  }
  
  // Get tenant from user metadata or default to 'trial'
  const tenant = data.user.user_metadata?.tenant_name || 'trial';
  const redirectPath = callbackUrl || `/${locale}/${tenant}/dashboard`;
  
  // Redirect to dashboard or callback URL
  return redirect(redirectPath);
}

async function signInWithOAuthAction(formData: FormData) {
  'use server';
  
  const provider = formData.get('provider') as 'google' | 'github';
  const locale = formData.get('locale') as string || 'en';
  
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  // Get the current origin for the redirect URL
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                (process.env.CODESPACE_NAME ? `https://${process.env.CODESPACE_NAME}-3000.app.github.dev` : 
                'http://localhost:3000'));
  
  console.log(`Initiating OAuth sign-in with ${provider}...`);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/${locale}/auth-redirect`,
      skipBrowserRedirect: true, // Don't redirect in the server action
    },
  });
  
  if (error) {
    console.error(`OAuth sign-in error with ${provider}:`, error);
    redirect(`/${locale}/login?error=${encodeURIComponent(error.message)}`);
  }
  
  // Redirect to the OAuth provider's authorization page
  if (data?.url) {
    console.log(`Redirecting to ${provider} authorization page...`);
    redirect(data.url);
  }
  
  // Fallback if no URL is returned
  console.error(`No URL returned from ${provider} OAuth initialization`);
  redirect(`/${locale}/login?error=Failed to initiate OAuth login`);
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { callbackUrl?: string; error?: string };
}) {
  // Await params and searchParams
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const locale = resolvedParams.locale;
  const callbackUrl = resolvedSearchParams.callbackUrl;
  const errorMessage = resolvedSearchParams.error;
  
  console.log("Login page loaded with params:", {
    locale,
    callbackUrl,
    errorMessage,
  });
  
  // Check if user is already logged in
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error getting session:", error);
    } else {
      console.log("Session status on login page:", {
        hasSession: !!data.session,
        userId: data.session?.user?.id,
      });
      
      // If user is already logged in, redirect to dashboard
      if (data.session) {
        const tenant = data.session.user.user_metadata?.tenant_name || 'trial';
        const redirectPath = callbackUrl || `/${locale}/${tenant}/dashboard`;
        console.log("User already logged in, redirecting to:", redirectPath);
        return redirect(redirectPath);
      }
    }
  } catch (error) {
    console.error("Unexpected error on login page:", error);
  }
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-8 left-8">
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-primary"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-2xl font-bold text-primary">Automai</span>
        </div>
      </div>

      <div className="w-full max-w-[400px] p-4 sm:p-0 space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
          <p className="text-sm text-muted-foreground">Enter your email below to sign in to your account</p>
        </div>

        <div className="grid gap-6">
          <form action={signInWithPassword} className="space-y-4">
            <input type="hidden" name="locale" value={locale} />
            {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
            
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Input
                  id="email"
                  name="email"
                  placeholder="Email"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  required
                  className="h-11"
                />
              </div>
              <div className="grid gap-1">
                <Input
                  id="password"
                  name="password"
                  placeholder="Password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-11"
                />
              </div>
              {errorMessage && (
                <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {errorMessage}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-base">
              Sign In
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form action={signInWithOAuthAction}>
              <input type="hidden" name="provider" value="google" />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="outline" className="w-full h-11">
                <Chrome className="mr-2 h-5 w-5" />
                Google
              </Button>
            </form>
            <form action={signInWithOAuthAction}>
              <input type="hidden" name="provider" value="github" />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="outline" className="w-full h-11">
                <Github className="mr-2 h-5 w-5" />
                GitHub
              </Button>
            </form>
          </div>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Don't have an account?{' '}
          <Link
            href={`/${locale}/signup`}
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            Sign up
          </Link>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          <Link
            href={`/${locale}/forgot-password`}
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
