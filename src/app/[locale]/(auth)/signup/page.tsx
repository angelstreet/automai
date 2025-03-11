'use client';

import { Chrome, Github } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useUser } from '@/context/UserContext';

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
      // Create user with our auth hook
      const redirectUrl = `${window.location.origin}/${locale}/auth-redirect`;
      const result = await signUp(email, password, name, redirectUrl);

      if (result?.session) {
        // Email confirmation not required, user is signed in
        setSuccess(true);

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push(`/${locale}/${result.user?.user_metadata?.tenant_id || 'default'}/dashboard`);
        }, 2000);
      } else if (result?.user) {
        // Email confirmation required
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'github') => {
    try {
      // Use our auth hook for OAuth
      const redirectUrl = `${window.location.origin}/${locale}/auth-redirect`;
      const result = await signInWithOAuth(provider, redirectUrl);

      if (result?.url) {
        // Redirect to OAuth provider
        window.location.href = result.url;
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
                <Chrome className="mr-2 h-5 w-5" />
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuthSignUp('github')}
                className="h-11"
              >
                <Github className="mr-2 h-5 w-5" />
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
