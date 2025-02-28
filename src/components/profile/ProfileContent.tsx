'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/contexts/UserContext';
import { useParams } from 'next/navigation';
import { Button } from '@/components/Shadcn/button';
import { Input } from '@/components/Shadcn/input';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProfileContent() {
  const { user, isLoading, refreshUser } = useUser();
  const { data: session } = useSession();
  const t = useTranslations('Profile');
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string | undefined;
  const [name, setName] = useState(user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleUpdateName = async () => {
    if (!session?.accessToken) return;
    try {
      setIsUpdating(true);
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ name }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      await refreshUser();
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
          <h2 className="text-xl font-semibold mb-4">Session Expired</h2>
          <p className="text-muted-foreground mb-4">Please log in again to continue</p>
          <Button onClick={() => (window.location.href = `/${locale}/login`)}>Log In</Button>
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
              <label className="text-sm font-medium">Name</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="max-w-md"
                />
                <Button onClick={handleUpdateName} disabled={isUpdating || name === user.name}>
                  {isUpdating ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
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
            <Button
              variant="outline"
              onClick={() => (window.location.href = `/${locale}/settings`)}
            >
              {t('manageSettings')}
            </Button>
            {user.plan !== 'ENTERPRISE' && (
              <Button
                variant="outline"
                onClick={() => (window.location.href = `/${locale}/upgrade`)}
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
