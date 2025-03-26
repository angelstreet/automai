'use client';

import { Chrome, Github } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useUser } from '@/context/UserContext';
import {
  signUp as signUpAction,
  signInWithOAuth as signInWithOAuthAction,
} from '@/app/actions/auth';

export default function SignUpPage() {
  const router = useRouter();
  const { locale } = useParams();
  const t = useTranslations('Auth');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [redirectCountdown, setRedirectCountdown] = React.useState(3);

  const { user, loading, error: authError, signUp, signInWithOAuth } = useUser();

  React.useEffect(() => {
    if (user && !loading) {
      router.push(`/${locale}/${user.user_metadata?.tenant_id || 'default'}/dashboard`);
    }
  }, [user, loading, router, locale]);

  React.useEffect(() => {
    if (authError) {
      setError(authError.message);
    }
  }, [authError]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
    } else if (success && redirectCountdown === 0) {
      // Redirect to login with prefilled credentials
      const searchParams = new URLSearchParams();
      searchParams.set('email', email);
      searchParams.set('password', password);
      router.push(`/${locale}/login?${searchParams.toString()}`);
    }
    return () => clearTimeout(timer);
  }, [success, redirectCountdown, email, password, router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validate that passwords match
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch') || 'Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      // Create user with server action
      const redirectUrl = `${window.location.origin}/${locale}/auth-redirect`;
      const result = await signUpAction(email, password, name, redirectUrl);

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      if (result.data?.session || result.data?.user) {
        setSuccess(true);
        setRedirectCountdown(3);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'github') => {
    try {
      const redirectUrl = `${window.location.origin}/${locale}/auth-redirect`;
      const result = await signInWithOAuthAction(provider, redirectUrl);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data?.url) {
        // Redirect to OAuth provider
        window.location.href = result.data.url;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

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
          <h1 className="text-2xl font-semibold tracking-tight">{t('signupTitle') || 'Sign Up'}</h1>
          <p className="text-sm text-muted-foreground">
            {t('signupDescription') || 'Create an account to get started'}
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md text-center">
            <p className="text-green-700 dark:text-green-300">
              {t('signupSuccess') ||
                'Account created successfully! Please check your email to verify your account.'}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              {t('redirecting')} {redirectCountdown}...
            </p>
            <Button className="mt-4 w-full" onClick={() => router.push(`/${locale}/login`)}>
              {t('backToLogin')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Input
                    id="name"
                    placeholder={t('namePlaceholder') || 'Your name'}
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="grid gap-1">
                  <Input
                    id="email"
                    placeholder={t('emailPlaceholder') || 'Email address'}
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
                    placeholder={t('passwordPlaceholder') || 'Password'}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="grid gap-1">
                  <Input
                    id="confirmPassword"
                    placeholder={t('confirmPasswordPlaceholder') || 'Confirm password'}
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isSubmitting
                  ? t('signingUp') || 'Signing up...'
                  : t('signupButton') || 'Create Account'}
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
              <Button
                variant="outline"
                onClick={() => handleOAuthSignUp('google')}
                className="h-11"
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
                variant="outline"
                onClick={() => handleOAuthSignUp('github')}
                className="h-11"
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
          </div>
        )}

        <div className="text-sm text-muted-foreground text-center">
          {t('alreadyHaveAccount') || 'Already have an account?'}{' '}
          <Link
            href={`/${locale}/login`}
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            {t('loginLink') || 'Sign in'}
          </Link>
        </div>
      </div>
    </div>
  );
}
