'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
  signUp as signUpAction,
  signInWithOAuth as signInWithOAuthAction,
} from '@/app/actions/authAction';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import teamMemberDb from '@/lib/db/teamMemberDb';

export default function InviteSignUpPage() {
  const router = useRouter();
  const params = useParams();
  const { locale, token } = params;
  const t = useTranslations('auth');
  const c = useTranslations('common');

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [redirectCountdown, setRedirectCountdown] = React.useState(3);
  const [invitationDetails, setInvitationDetails] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch the invitation details
  React.useEffect(() => {
    const fetchInvitation = async () => {
      try {
        // Use absolute URL to ensure it works in production
        const baseUrl = window.location.origin;
        // Call our API to get invitation details
        const response = await fetch(`${baseUrl}/api/invitations/${token}`);

        if (!response.ok) {
          throw new Error('Invalid or expired invitation');
        }

        const data = await response.json();
        setInvitationDetails(data);
        setEmail(data.email); // Pre-fill the email from the invitation
      } catch (err: any) {
        setError(err.message || 'Failed to load invitation');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const hasSession =
          localStorage.getItem('sb-auth-token') || sessionStorage.getItem('supabase.auth.token');

        if (hasSession) {
          router.push(`/${locale}/`);
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };

    checkSession();
  }, [router, locale]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    } else if (success && redirectCountdown === 0) {
      router.push(`/${locale}/login`);
    }
    return () => clearTimeout(timer);
  }, [success, redirectCountdown, router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError(t('error_passwords_do_not_match'));
      setIsSubmitting(false);
      return;
    }

    try {
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}/${locale}/login`;
      const result = await signUpAction(email, password, name, redirectUrl);

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Update invitation status to accepted
      await fetch(`${baseUrl}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

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

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4">{t('loading')}</p>
      </div>
    );
  }

  if (error && !invitationDetails) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-md p-6 space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t('invitation_error')}</h1>
            <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>
            <div className="mt-6">
              <Link
                href={`/${locale}/login`}
                className="inline-flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('back_to_login')}
              </Link>
            </div>
          </div>
        </div>
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
            className="h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-xl font-bold">AutomAI</span>
        </div>
      </div>

      <div className="w-full max-w-md p-6 space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('join_team')}</h1>
          {invitationDetails && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {t('join_team_invite_desc', {
                teamName: invitationDetails.teams?.name || 'Team',
                role: invitationDetails.role,
              })}
            </p>
          )}
        </div>

        {success ? (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-center">
            <p className="text-green-700 dark:text-green-300">{t('signup_success')}</p>
            <p className="text-green-700 dark:text-green-300 mt-1">
              {t('redirecting_in_seconds', { count: redirectCountdown })}
            </p>
            <div className="mt-3">
              <Link
                href={`/${locale}/login`}
                className="inline-flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('back_to_login')}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                {c('name')}
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 border border-gray-200 dark:border-gray-700"
                placeholder={t('signup_name_placeholder')}
                autoComplete="name"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                {c('email')}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 border border-gray-200 dark:border-gray-700"
                placeholder={t('signin_email_placeholder')}
                autoComplete="email"
                disabled={true} // Email is pre-filled and can't be changed for invitations
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                {c('password')}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 border border-gray-200 dark:border-gray-700"
                placeholder={t('signin_password_placeholder')}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium">
                {t('signup_confirm_password')}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 border border-gray-200 dark:border-gray-700"
                placeholder={t('signup_confirm_password_placeholder')}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-md text-red-800 dark:text-red-100 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('signup_signing') : t('join_team_button')}
            </Button>

            <div className="text-center mt-4 text-sm text-gray-500">
              {t('already_have_account')}{' '}
              <Link
                href={`/${locale}/login`}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('signin_button')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
