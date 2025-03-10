'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export function ProfileContent() {
  const { user, loading, refreshUser } = useAuth();
  const { updateProfile, isUpdating } = useProfile();
  const t = useTranslations('Profile');
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string | undefined;
  const [name, setName] = useState('');
  const router = useRouter();

  // Update name state when user data becomes available
  useEffect(() => {
    if (user) {
      // Extended debug logging - VERSION 2025-03-09
      console.log('🔍 PROFILE COMPONENT: Full user object:', user);
      console.log('🔍 PROFILE COMPONENT: User metadata:', user.user_metadata);
      console.log('🔍 PROFILE COMPONENT: Direct name on metadata:', user.user_metadata?.name);
      console.log('🔍 PROFILE COMPONENT: Direct name on user:', user.name);
      
      // Check all possible name locations
      const possibleNames = {
        'user.name': user.name,
        'user.user_metadata.name': user.user_metadata?.name,
        'user.user_metadata.full_name': user.user_metadata?.full_name,
        'user.user_metadata.raw_user_meta_data?.name': (user.user_metadata as any)?.raw_user_meta_data?.name,
        'user.user_metadata.preferred_username': user.user_metadata?.preferred_username,
        'email username': user.email?.split('@')[0]
      };
      
      console.log('🔍 PROFILE COMPONENT: All possible name values:', possibleNames);
      
      // Use any available name with priority order
      const userName = user?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || 
                      (user.user_metadata as any)?.raw_user_meta_data?.name || 
                      user?.user_metadata?.preferred_username || 
                      user?.email?.split('@')[0] || '';
      
      console.log('🔍 PROFILE COMPONENT: Selected username:', userName);
      setName(userName);
    }
  }, [user]);

  // No need to auto-refresh on mount - would cause infinite loop

  const handleUpdateName = async () => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('locale', locale);
      await updateProfile(formData);
      // Refresh user data after update
      await refreshUser();
    } catch (error) {
      console.error('Error updating profile:', error);
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
                  disabled={isUpdating || name === (user.name || user.user_metadata?.name || '')}
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
              <p className="text-muted-foreground">{(user.user_metadata as any)?.plan || 'TRIAL'}</p>
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
            {((user.user_metadata as any)?.plan !== 'ENTERPRISE') && (
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/${tenant || 'trial'}/billing`)}
              >
                {t('upgradePlan')}
              </Button>
            )}
          </div>
        </div>

        {/* Tenant Information (Enterprise only) */}
        {((user.user_metadata as any)?.plan === 'ENTERPRISE') && tenant && (
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
