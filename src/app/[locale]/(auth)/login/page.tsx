'use client';

import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import * as React from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useUser } from '@/context/UserContext';
import {
  signInWithOAuth as signInWithOAuthAction,
  signInWithPassword as signInWithPasswordAction,
} from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useParams();
  const t = useTranslations('Auth');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);

  // Use the user hook only for user data and loading state
  const { user, loading, error: authError } = useUser();

  // Redirect if user is already logged in
  React.useEffect(() => {
    // Check for auth cookies, even if the user object isn't loaded yet
    // This is a workaround for cases where the session exists but isn't being detected
    const hasSbAccessToken = document.cookie.includes('sb-access-token');
    const hasSbRefreshToken = document.cookie.includes('sb-refresh-token');

    console.log('🔒 LOGIN PAGE: Auth cookie check:', {
      hasSbAccessToken,
      hasSbRefreshToken,
      userLoaded: !!user,
      isLoading: loading,
    });

    if (user && !loading) {
      // tenant_name is directly on the user object (not in user_metadata)
      const tenantName = user.tenant_name || 'trial';

      console.log('🔒 LOGIN PAGE: Redirecting to tenant dashboard:', tenantName);
      router.push(`/${locale}/${tenantName}/dashboard`);
    }
    // Fallback redirect if we have auth cookies but the user object isn't loading
    else if (hasSbAccessToken && hasSbRefreshToken && !loading) {
      console.log(
        '🔒 LOGIN PAGE: Auth cookies present but no user object, attempting fallback redirect',
      );
      // Use default tenant for fallback
      router.push(`/${locale}/trial/dashboard`);
    }
  }, [user, loading, router, locale]);

  // Set error from auth hook if present
  React.useEffect(() => {
    if (authError) {
      setError(authError.message);
      setIsAuthenticating(false);
    }
  }, [authError]);

  // Check if we were redirected back to login page after an OAuth attempt
  React.useEffect(() => {
    // If we have an error in the URL, it means we were redirected back after a failed OAuth attempt
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setIsAuthenticating(false);
    }
  }, []);

  // Add safety timeout to reset temporary states if they get stuck
  React.useEffect(() => {
    // If authentication states persist for more than 5 seconds, reset them
    const safetyTimeout = setTimeout(() => {
      if (isSubmitting || isAuthenticating) {
        console.log('🔒 LOGIN PAGE: Safety timeout triggered - resetting temporary states');
        setIsSubmitting(false);
        setIsAuthenticating(false);
      }
    }, 5000);

    return () => clearTimeout(safetyTimeout);
  }, [isSubmitting, isAuthenticating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting || loading || isAuthenticating) {
      return;
    }

    setError('');
    setIsSubmitting(true);
    setIsAuthenticating(true);

    try {
      // Use the server action directly instead of going through UserContext
      const result = await signInWithPasswordAction(email, password);

      if (result.success && result.data?.session) {
        // tenant_name is directly on the user object (not in user_metadata)
        const tenantName = result.data.user?.tenant_name || 'trial';

        console.log('Login submission redirecting to tenant:', tenantName);
        // Redirect to dashboard
        router.push(`/${locale}/${tenantName}/dashboard`);
      } else {
        // If authentication failed, show the error
        setError(result.error || 'Failed to sign in');
        setIsSubmitting(false);
        setIsAuthenticating(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsSubmitting(false);
      setIsAuthenticating(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setIsAuthenticating(true);
      setError('');

      const redirectUrl = `${window.location.origin}/${locale}/auth-redirect`;
      // Use the server action directly instead of going through UserContext
      const result = await signInWithOAuthAction(provider, redirectUrl);

      if (result.success && result.data?.url) {
        // Redirect to OAuth provider
        window.location.href = result.data.url;
      } else {
        // If no URL is returned, something went wrong
        setError(result.error || 'Failed to initiate login');
        setIsAuthenticating(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsAuthenticating(false);
    }
  };

  // Determine if buttons should be disabled - simplify by removing redundant loading state
  const isButtonDisabled = isSubmitting || isAuthenticating;

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
            className="h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-xl font-bold">AutomAI</span>
        </div>
      </div>
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('signIn')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('signInToYourAccount')}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              {t('email')}
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
              placeholder="you@example.com"
              autoComplete="username"
              disabled={isButtonDisabled}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">
                {t('password')}
              </label>
              <a
                href={`/${locale}/forgot-password`}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('forgotPassword')}
              </a>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
              autoComplete="current-password"
              disabled={isButtonDisabled}
            />
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md text-red-800 dark:text-red-100 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isButtonDisabled}>
            {isSubmitting ? t('signingIn') : t('signIn')}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuthLogin('google')}
              className="flex items-center justify-center"
              disabled={isButtonDisabled}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuthLogin('github')}
              className="flex items-center justify-center"
              disabled={isButtonDisabled}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
                  fill="currentColor"
                />
              </svg>
              GitHub
            </Button>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('dontHaveAccount')}{' '}
              <a
                href={`/${locale}/signup`}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('signUp')}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
