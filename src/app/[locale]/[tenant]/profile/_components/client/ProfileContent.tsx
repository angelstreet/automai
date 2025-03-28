'use client';

import { User } from '@/types/user';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/context';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Button } from '@/components/shadcn/button';
import { PageHeader } from '@/components/layout/PageHeader';

interface ProfileContentProps {
  user?: User | null;
  updateProfile?: (formData: FormData) => Promise<void>;
  refreshUser?: () => Promise<User | null>;
  clearCache?: () => Promise<void>;
}

export function ProfileContent({
  user: propUser,
  updateProfile: propUpdateProfile,
  refreshUser: propRefreshUser,
}: ProfileContentProps) {
  const { user: contextUser, loading, refreshUser: contextRefreshUser, updateProfile: contextUpdateProfile } = useUser();
  
  // Use provided props or fall back to context
  const user = propUser || contextUser;
  const updateProfile = propUpdateProfile || contextUpdateProfile;
  const refreshUser = propRefreshUser || contextRefreshUser;
  
  const t = useTranslations('Profile');
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string || user?.tenant_id || 'trial';
  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  // Update name state when user data becomes available
  useEffect(() => {
    if (user) {
      const userName = user.name || user.email?.split('@')[0] || '';
      setName(userName);
    }
  }, [user]);

  const handleUpdateName = async () => {
    try {
      setIsUpdating(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('locale', locale);
      await updateProfile(formData);
      await refreshUser();
      setIsUpdating(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setIsUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">{t('sessionExpired')}</h2>
          <p className="text-muted-foreground mb-4">{t('pleaseLogin')}</p>
          <Button
            onClick={() => {
              document.cookie.split(';').forEach((c) => {
                document.cookie = c
                  .replace(/^ +/, '')
                  .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
              });
              window.location.href = `/${locale}/login`;
            }}
          >
            {t('logIn')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <PageHeader title={t('title')} description={t('settings')} />
      <div className="space-y-6">
        <div className="grid gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('personalInfo')}</CardTitle>
              <CardDescription>{t('edit')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <p className="text-muted-foreground">{'TRIAL'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('accountSettings')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/${tenant}/settings`)}
              >
                {t('manageSettings')}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/${tenant}/billing`)}
              >
                {t('upgradePlan')}
              </Button>
            </CardContent>
          </Card>

          {/* Tenant Information */}
          {tenant && (
            <Card>
              <CardHeader>
                <CardTitle>{t('workspaceInfo')}</CardTitle>
                <CardDescription>{t('manageTeam')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Workspace ID</label>
                  <p className="text-muted-foreground">{tenant}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/${locale}/${tenant}/team`)}
                >
                  {t('manageTeam')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}