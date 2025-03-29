'use client';

import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { resetPasswordForEmail } from '@/app/actions/auth';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useUser } from '@/context/UserContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { locale } = useParams();
  const t = useTranslations('Auth');
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Use the auth hook only for loading state
  const { error: authError, loading } = useUser();

  // Set error from auth hook if present
  React.useEffect(() => {
    if (authError) {
      setError(authError.message);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const redirectUrl = `${window.location.origin}/${locale}/reset-password`;
      // Use the server action directly instead of going through UserContext
      const result = await resetPasswordForEmail(email, redirectUrl);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to send password reset email');
      }
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
            className="h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-xl font-bold">AutomAI</span>
        </div>
      </div>
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('forgotPassword')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('enterEmailToReset')}</p>
        </div>

        {success ? (
          <div className="bg-green-100 dark:bg-green-900 p-4 rounded-md text-green-800 dark:text-green-100">
            {t('resetLinkSent')}
          </div>
        ) : (
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
              />
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md text-red-800 dark:text-red-100 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
              {isSubmitting || loading ? t('sending') : t('sendResetLink')}
            </Button>

            <div className="text-center mt-4">
              <a
                href={`/${locale}/login`}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('backToLogin')}
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
