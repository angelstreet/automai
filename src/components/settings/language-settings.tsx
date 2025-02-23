'use client';

import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
];

export function LanguageSettings() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('Settings');
  const currentLocale = params.locale as string;
  const tenant = params.tenant as string;

  const handleLanguageChange = (newLocale: string) => {
    // Replace the current locale in the URL with the new one
    const newPath = window.location.pathname.replace(`/${currentLocale}/`, `/${newLocale}/`);
    // Use window.location.href to force a full page refresh which will reapply the theme
    window.location.href = newPath;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('languageSettings')}</CardTitle>
        <CardDescription>{t('languageDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('currentLanguage')}</label>
            <Select value={currentLocale} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('selectLanguage')} />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {t(lang.code === 'en' ? 'english' : 'french')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 