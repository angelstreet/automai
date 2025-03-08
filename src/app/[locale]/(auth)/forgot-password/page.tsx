'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { createBrowserClient } from '@/lib/supabase';

export default async function ForgotPasswordPage() {
  const router = useRouter();
  const { locale } = useParams();
  const t = useTranslations('Auth');
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/reset-password`,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-2xl font-semibold tracking-tight">{t('forgotPassword')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('resetPasswordDescription') ||
              'Enter your email address and we will send you a link to reset your password.'}
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md text-center">
            <p className="text-green-700 dark:text-green-300">
              {t('resetPasswordSuccess') || 'Password reset link has been sent to your email.'}
            </p>
            <Button className="mt-4 w-full" onClick={() => router.push(`/${locale}/login`)}>
              {t('backToLogin')}
            </Button>
          </div>
        ) : (
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
              {error && (
                <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {error}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
              {isSubmitting ? t('sending') || 'Sending...' : t('resetPassword') || 'Reset Password'}
            </Button>
          </form>
        )}

        <div className="text-sm text-muted-foreground text-center">
          <Link
            href={`/${locale}/login`}
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
