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

export function ProfileSkeleton() {
  const t = useTranslations('Profile');

  return (
    <div className="container mx-auto py-4 px-4 space-y-6">
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
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full max-w-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-64" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-36" />
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
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
            </CardContent>
          </Card>

          {/* Workspace Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('workspaceInfo')}</CardTitle>
              <CardDescription>{t('manageTeam')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-10 w-48" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
