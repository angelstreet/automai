'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useUser } from '@/context/UserContext';

export function ProfileContent() {
  const { user, loading, refreshUser, updateProfile } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const t = useTranslations('Profile');
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string | undefined;
  const [name, setName] = useState('');
  const router = useRouter();

  // Update name state when user data becomes available
  useEffect(() => {
    if (user) {
      // In auth.ts, user_metadata fields are already extracted to the top-level user object
      console.log('🔍 PROFILE COMPONENT: Full user object:', user);
      console.log('🔍 PROFILE COMPONENT: Direct name on user:', user.name);
      
      // Use the name directly from the user object
      // The auth service already extracts name from metadata
      const userName = user.name || user.email?.split('@')[0] || '';
      
      console.log('🔍 PROFILE COMPONENT: Selected username:', userName);
      setName(userName);
    }
  }, [user]);

  // No need to auto-refresh on mount - would cause infinite loop

  const handleUpdateName = async () => {
    try {
      setIsUpdating(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('locale', locale);
      await updateProfile(formData);
      // Refresh user data after update
      await refreshUser();
      setIsUpdating(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setIsUpdating(false);
    }
  };

  if (loading) {
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
          <Button onClick={() => {
            // Clear any stale authentication data
            document.cookie.split(";").forEach((c) => {
              document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
            });
            window.location.href = `/${locale}/login`;
          }}>{t('logIn')}</Button>
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
                <Button 
                  onClick={handleUpdateName} 
                  disabled={isUpdating || name === user.name}
                >
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
          </div>
        </div>

        {/* Account Settings */}
        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t('accountSettings')}</h2>
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/${tenant || 'trial'}/settings`)}
            >
              {t('manageSettings')}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/${tenant || 'trial'}/billing`)}
            >
              {t('upgradePlan')}
            </Button>
          </div>
        </div>

        {/* Tenant Information */}
        {tenant && (
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
