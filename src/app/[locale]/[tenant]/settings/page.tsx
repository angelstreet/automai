'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { LanguageSettings } from '@/components/settings/LanguageSettings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

export default function SettingsPage() {
  const _params = useParams();
  const t = useTranslations('Settings');

  return (
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
  );
}
