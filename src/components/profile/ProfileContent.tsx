'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export function ProfileContent() {
  const { user, isLoading } = useAuth();
  const { updateProfile, isUpdating } = useProfile();
  const t = useTranslations('Profile');
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string | undefined;
  const [name, setName] = useState(user?.user_metadata?.name || '');
  const router = useRouter();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile({ name });
    if (success) {
      router.back();
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">{t('title')}</h2>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                {t('name')}
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                {t('email')}
              </label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <label htmlFor="plan" className="block text-sm font-medium mb-2">
                {t('plan')}
              </label>
              <Input
                id="plan"
                value={user.user_metadata?.plan || 'TRIAL'}
                disabled
                className="bg-muted"
              />
            </div>

            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? t('saving') : t('save')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
