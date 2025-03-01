'use client';

import { ArrowLeft } from 'lucide-react';

import { useParams, useRouter } from 'next/navigation';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';

import { Input } from '@/components/shadcn/input';
import { useUser } from '@/context/UserContext';

export function ProfileContent() {
  const { user, isLoading, updateProfile } = useUser();
  const t = useTranslations('Profile');
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string | undefined;
  const [name, setName] = useState(user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleUpdateName = async () => {
    try {
      setIsUpdating(true);
      await updateProfile({ name });
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

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
          <h2 className="text-xl font-semibold mb-4">{t('sessionExpired')}</h2>
          <p className="text-muted-foreground mb-4">{t('pleaseLogin')}</p>
          <Button onClick={() => (window.location.href = `/${locale}/login`)}>{t('logIn')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t('personalInfo')}</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('name')}</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('enterName')}
                  className="max-w-md"
                />
                <Button onClick={handleUpdateName} disabled={isUpdating || name === user.name}>
                  {isUpdating ? t('updating') : t('update')}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('email')}</label>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium">{t('plan')}</label>
              <p className="text-muted-foreground">{user.plan}</p>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t('accountSettings')}</h2>
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/${tenant || 'default'}/settings`)}
            >
              {t('manageSettings')}
            </Button>
            {user.plan !== 'ENTERPRISE' && (
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/${tenant || 'default'}/billing`)}
              >
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
              <Button
                variant="outline"
                onClick={() => (window.location.href = `/${locale}/${tenant}/team`)}
              >
                {t('manageTeam')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
