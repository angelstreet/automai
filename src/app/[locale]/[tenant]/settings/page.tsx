'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/Shadcn/card';
import { LanguageSettings } from '@/components/Settings/LanguageSettings';
import { SettingsHeader } from '@/components/Settings/SettingsHeader';

export default function SettingsPage() {
  const params = useParams();
  const t = useTranslations('Settings');

  return (
    <div className="container mx-auto px-4 py-8">
      <SettingsHeader title={t('title')} description={t('description')} />
      <div className="grid gap-6 mt-6">
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
  );
}
