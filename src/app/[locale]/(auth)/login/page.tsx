'use client';

import { Chrome, Github } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import * as React from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useUser } from '@/context/UserContext';

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const t = useTranslations('Auth');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Normalize the callback URL to handle case sensitivity issues
  const normalizeUrl = (url: string | null): string | null => {
    if (!url) return url;

    // Convert to lowercase to handle case sensitivity issues
    return url.toLowerCase();
  };

  // Normalize the callback URL
  const normalizedCallbackUrl = normalizeUrl(callbackUrl);

  // Log callback URL for debugging
  useEffect(() => {
    console.log('Login page - Callback URL:', callbackUrl);
    if (callbackUrl !== normalizedCallbackUrl) {
      console.log('Login page - Normalized callback URL:', normalizedCallbackUrl);
    }
  }, [callbackUrl, normalizedCallbackUrl]);

  // Function to handle API call errors with retry
  const callWithRetry = async (apiCall: () => Promise<any>, maxRetries = 3): Promise<any> => {
    let attempt = 0;
    let lastError: any;

    while (attempt < maxRetries) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        console.error(`API call failed (attempt ${attempt + 1}/${maxRetries}):`, error);

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        attempt++;
      }
    }

    console.error(`All ${maxRetries} retry attempts failed`);
    throw lastError;
  };

  // Get user context with all needed methods
  const { getSession, user, signInWithPassword, signInWithOAuth } = useUser();

  // Check if user is already authenticated
  useEffect(() => {
    // Check for existing Supabase session with retry logic
    let checkAttempts = 0;
    const maxAttempts = 3;

    async function checkSession() {
      try {
        console.log('Login page - Checking for existing session...');

        // Use retry logic for API calls
        const { data } = await callWithRetry(() => getSession());

        if (data.session) {
          console.log('Login page - Session found, redirecting:', {
            userId: data.session.user.id,
            email: data.session.user.email,
            tokenExpiry: data.session.expires_at
              ? new Date(data.session.expires_at * 1000).toISOString()
              : 'unknown',
            callbackUrl,
          });

          // User is already logged in, redirect to dashboard or callback URL
          setTimeout(() => {
            // If there's a callback URL, use it, otherwise go to dashboard
            const redirectPath = normalizedCallbackUrl || `/${locale}/trial/dashboard`;
            console.log('Redirecting to:', redirectPath);
            router.replace(redirectPath);
          }, 100); // Small delay to ensure proper redirection
        } else {
          console.log('Login page - No session found, showing login form');
          setIsLoading(false);

          if (checkAttempts < maxAttempts) {
            // Retry after a delay with exponential backoff
            checkAttempts++;
            const delay = 1000 * Math.pow(2, checkAttempts);
            console.log(
              `Login page - Will retry session check in ${delay}ms (attempt ${checkAttempts})`,
            );

            setTimeout(checkSession, delay);
          }
        }
      } catch (error) {
        console.error('Login page - Error checking session:', error);
        setIsLoading(false);

        // Show a more specific error message for network issues
        if (error instanceof Error && error.message.includes('fetch failed')) {
          setError(
            'Network error: Unable to connect to authentication service. Please check your internet connection.',
          );
        }
      }
    }

    // If user is already loaded, redirect without checking session
    if (user) {
      console.log('Login page - User already in context, redirecting');
      const redirectPath = normalizedCallbackUrl || `/${locale}/trial/dashboard`;
      router.replace(redirectPath);
      return;
    }

    checkSession();
  }, [router, locale, normalizedCallbackUrl, getSession, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      console.log('Login page - Attempting sign in with password...');

      // Use retry logic for API calls
      const { data, error } = await callWithRetry(() =>
        signInWithPassword(email, password),
      );

      if (error) {
        console.error('Login page - Sign in error:', error);
        setError(error.message);
        setIsSubmitting(false);
        return;
      }

      if (data?.session) {
        console.log('Login page - Sign in successful:', {
          userId: data.session.user.id,
          email: data.session.user.email,
          tokenLength: data.session.access_token?.length || 0,
          callbackUrl,
        });

        // Manually set a cookie with the token to ensure it's available
        // This is a backup in case the Supabase cookie handling isn't working
        try {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          if (data.session.access_token) {
            // Set a backup cookie with the token
            document.cookie = `sb-manual-token=${data.session.access_token}; path=/; expires=${tomorrow.toUTCString()}; SameSite=Lax`;
            console.log('Login page - Manually set backup token cookie');

            // Also try localStorage as another backup
            localStorage.setItem('sb-manual-token', data.session.access_token);
            localStorage.setItem('sb-user-email', data.session.user.email || '');
            localStorage.setItem('sb-user-id', data.session.user.id || '');
            console.log('Login page - Saved token in localStorage');
          }
        } catch (err) {
          console.error('Login page - Error setting manual cookies:', err);
        }

        // Login successful, redirect to callback URL or dashboard
        setTimeout(() => {
          // Use replace to avoid having login in history
          let redirectPath = normalizedCallbackUrl || `/${locale}/trial/dashboard`;

          // Always normalize the entire path to lowercase
          redirectPath = redirectPath.toLowerCase();

          console.log('Login successful, redirecting to:', redirectPath);
          router.replace(redirectPath);
        }, 1500); // Even longer delay to ensure cookies are set
      } else {
        console.error('Login page - No session returned after successful login');
        setError('Authentication successful but no session was created');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('Login page - Error during login:', err);

      // Show a more specific error message for network issues
      if (err.message && err.message.includes('fetch failed')) {
        setError(
          'Network error: Unable to connect to authentication service. Please check your internet connection.',
        );
      } else {
        setError(err.message || 'An error occurred during login');
      }

      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setError('');
    setIsSubmitting(true);

    try {
      // Use Supabase OAuth
      console.log(`Starting ${provider} OAuth login flow`);
      const { data, error } = await signInWithOAuth(provider);

      if (error) {
        console.error(`${provider} OAuth error:`, error);
        setError(error.message || `Failed to authenticate with ${provider}`);
        setIsSubmitting(false);
        return;
      }

      // If we reach here, it means the OAuth popup was successfully launched
      console.log(`${provider} OAuth flow initiated:`, {
        provider,
        url: data?.url,
        hasUrl: !!data?.url,
      });

      // No need to set isSubmitting to false as we're redirecting to provider
    } catch (err: any) {
      console.error(`${provider} OAuth error:`, err);
      setError(err.message || `An unexpected error occurred with ${provider} sign in`);
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
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
          <h1 className="text-2xl font-semibold tracking-tight">{t('loginTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('loginDescription')}</p>
        </div>

        <div className="grid gap-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Input
                  id="email"
                  placeholder={t('emailPlaceholder')}
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="grid gap-1">
                <Input
                  id="password"
                  placeholder={t('passwordPlaceholder')}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              {error && (
                <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {error}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
              {isSubmitting ? t('loggingIn') : t('loginButton')}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => handleOAuthLogin('google')} className="h-11">
              <Chrome className="mr-2 h-5 w-5" />
              Google
            </Button>
            <Button variant="outline" onClick={() => handleOAuthLogin('github')} className="h-11">
              <Github className="mr-2 h-5 w-5" />
              GitHub
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          {t('noAccount')}{' '}
          <Link
            href={`/${locale}/signup`}
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            {t('signupLink')}
          </Link>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          <Link
            href={`/${locale}/forgot-password`}
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            {t('forgotPassword')}
          </Link>
        </div>
      </div>
    </div>
  );
}
