'use client';

import { useTranslations } from 'next-intl';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

export function SettingsContent() {
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
            <CardContent>{/* General settings content will go here */}</CardContent>
          </Card>

          {/* Language Settings */}
          <LanguageSettings />
        </div>
      </div>
    </div>
  );
}
