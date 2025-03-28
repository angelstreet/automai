'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/shadcn/skeleton';
import { useTranslations } from 'next-intl';

export function SettingsSkeleton() {
  const t = useTranslations('Settings');

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="space-y-6">
        <div className="grid gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('generalSettings')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('languageSettings')}</CardTitle>
              <CardDescription>{t('languageDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-[200px]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}