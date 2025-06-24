'use client';

import { Loader2 } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { Button } from '@/components/shadcn/button';

export default function InviteSignUpPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { locale, token } = params as { locale: string; token: string };
  const t = useTranslations('auth');

  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [invitationDetails, setInvitationDetails] = React.useState<any>(null);

  // Get query params - Supabase might redirect with code and hash
  const authCode = searchParams.get('code');
  const authType = searchParams.get('type');

  // If there's an auth code, we're in a redirect from Supabase Auth
  React.useEffect(() => {
    if (authCode && authType) {
      console.log('Magic link redirect detected - processing login');
      // Handle the auth redirect - we just show a success message as Supabase handles the password setup
      setSuccess(true);
      setIsLoading(false);

      // We can also try to accept the invitation automatically
      const acceptInvitation = async () => {
        try {
          const baseUrl = window.location.origin;
          await fetch(`${baseUrl}/api/invitations/${token}/accept`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });
          console.log('Automatically accepted invitation');
        } catch (err) {
          console.error('Failed to automatically accept invitation:', err);
          // We don't show an error for this - the user can still proceed
        }
      };

      acceptInvitation();
      return;
    }

    // If no auth code, fetch the invitation details
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

    fetchInvitation();
  }, [token, authCode, authType]);

  // If success, show confirmation
  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="mx-auto w-full max-w-md space-y-6 rounded-lg bg-background p-6 shadow-lg">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">{t('invite_success_title')}</h1>
            <p className="text-muted-foreground">{t('invite_success_description')}</p>
          </div>

          <div className="space-y-4 bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
            <p className="text-center text-sm text-green-800 dark:text-green-300">
              {t('invite_login_successful')}
            </p>

            <p className="text-center text-sm text-muted-foreground">{t('invite_team_access')}</p>
          </div>

          <div className="pt-4">
            <Button
              className="w-full"
              onClick={() =>
                router.push(`/${locale}/${invitationDetails?.tenant || 'default'}/dashboard`)
              }
            >
              {t('go_to_dashboard')}
            </Button>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/${locale}/login`)}
            >
              {t('back_to_login')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-lg bg-background p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t('invitation_title')}</h1>
          <p className="text-muted-foreground">
            {isLoading
              ? t('loading')
              : invitationDetails
                ? t('invitation_description')
                : t('invitation_invalid')}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="my-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : invitationDetails ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('invited_to_team', { teamName: invitationDetails.team_name })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('invited_as_role', { role: invitationDetails.role })}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                {t('invitation_check_email')}
              </p>
              <p className="text-center font-medium">{email}</p>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {t('invitation_email_instructions')}
            </div>

            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/${locale}/login`)}
              >
                {t('go_to_login')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
