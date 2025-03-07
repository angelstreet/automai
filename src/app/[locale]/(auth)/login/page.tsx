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

  // Simple timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Get user context
  const { user, signInWithPassword, signInWithOAuth } = useUser();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      console.log('User already logged in, redirecting to dashboard');
      const redirectPath = callbackUrl || `/${locale}/trial/dashboard`;
      
      // First try with router
      router.replace(redirectPath);
      
      // Use window.location as a fallback for more forceful redirect
      // Add a slight delay to allow router.replace to happen first
      const redirectTimer = setTimeout(() => {
        console.log('Forcing redirect with window.location');
        window.location.href = redirectPath;
      }, 500);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, router, locale, callbackUrl]);

  // Check for error query param from failed OAuth redirects
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      console.log('Attempting email/password login');
      const { data, error } = await signInWithPassword(email, password);

      if (error) {
        console.error('Login error:', error.message);
        setError(error.message);
        setIsSubmitting(false);
        return;
      }

      if (data?.session) {
        console.log('Login successful, redirecting');
        // Login successful, redirect to callback URL or dashboard
        const redirectPath = callbackUrl || `/${locale}/trial/dashboard`;
        router.replace(redirectPath);
      } else {
        setError('Authentication successful but no session was created');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      setError(err.message || 'An error occurred during login');
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setError('');
    setIsSubmitting(true);

    try {
      console.log(`Initiating ${provider} OAuth login`);
      const { error } = await signInWithOAuth(provider);
      
      if (error) {
        console.error(`${provider} OAuth error:`, error);
        setError(error.message);
        setIsSubmitting(false);
      }
      // On success, the OAuth flow will redirect to auth-redirect
    } catch (err: any) {
      console.error(`${provider} OAuth exception:`, err);
      setError(err.message || `An unexpected error occurred with ${provider} sign in`);
      setIsSubmitting(false);
    }
  };

  // Show loading state
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
