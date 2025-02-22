'use client';

import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/contexts/UserContext';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ProfileContent() {
  const { user, isLoading } = useUser();
  const t = useTranslations('Profile');
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Session Expired</h2>
          <p className="text-muted-foreground mb-4">Please log in again to continue</p>
          <Button onClick={() => window.location.href = `/${locale}/login`}>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        {tenant && (
          <div className="text-sm text-muted-foreground">
            Workspace: {tenant}
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t('personalInfo')}</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Plan</label>
              <p className="text-muted-foreground">{user.plan}</p>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t('accountSettings')}</h2>
          <div className="space-y-4">
            <Button variant="outline" onClick={() => window.location.href = `/${locale}/settings`}>
              {t('manageSettings')}
            </Button>
            {user.plan !== 'ENTERPRISE' && (
              <Button variant="outline" onClick={() => window.location.href = `/${locale}/upgrade`}>
                {t('upgradePlan')}
              </Button>
            )}
          </div>
        </div>

        {/* Tenant Information (Enterprise only) */}
        {user.plan === 'ENTERPRISE' && tenant && (
          <div className="p-6 bg-card rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">{t('workspaceInfo')}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Workspace ID</label>
                <p className="text-muted-foreground">{tenant}</p>
              </div>
              <Button variant="outline" onClick={() => window.location.href = `/${locale}/${tenant}/team`}>
                {t('manageTeam')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 