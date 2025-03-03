'use client';

import { Chrome, Github } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import * as React from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useParams();
  const { data: session, status } = useSession();
  const t = useTranslations('Auth');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // User is already logged in, redirect to appropriate dashboard
      // Get tenant from session, fallback to trial if no tenant
      const tenant = session.user.tenantName || 'trial';
      router.push(`/${locale}/${tenant}/dashboard`);
    }
  }, [session, status, router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: `/${locale}/trial/dashboard`,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.ok) {
        router.push(`/${locale}/trial/dashboard`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    signIn(provider, { callbackUrl: `/${locale}/(auth)/auth-redirect` });
  };

  // Show nothing while checking initial auth state
  if (status === 'loading') {
    return null;
  }

  // Show nothing if already authenticated (_will be redirected)
  if (status === 'authenticated') {
    return null;
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
