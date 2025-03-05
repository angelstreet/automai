'use client';

import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useParams();
  const t = useTranslations('Auth');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch') || 'Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createBrowserSupabase();
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        setError(error.message);
        return;
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 3000);
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
          <h1 className="text-2xl font-semibold tracking-tight">{t('resetPassword') || 'Reset Password'}</h1>
          <p className="text-sm text-muted-foreground">
            {t('resetPasswordDescription') || 'Enter your new password below.'}
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md text-center">
            <p className="text-green-700 dark:text-green-300">
              {t('passwordResetSuccess') || 'Your password has been reset successfully. You will be redirected to login.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Input
                  id="password"
                  placeholder={t('newPasswordPlaceholder') || 'New password'}
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
              {isSubmitting ? 
                (t('resetting') || 'Resetting...') : 
                (t('resetPasswordButton') || 'Reset Password')}
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