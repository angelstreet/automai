'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';

const languages = [
  { code: 'en', name: 'English' },
  //{ code: 'fr', name: 'Français' }, // Temporarily removed during development
];

export function LanguageSettings() {
  const params = useParams();
  const t = useTranslations('settings');
  const currentLocale = params.locale as string;

  const handleLanguageChange = (newLocale: string) => {
    // Replace the current locale in the URL with the new one
    const newPath = window.location.pathname.replace(`/${currentLocale}/`, `/${newLocale}/`);
    // Use window.location.href to force a full page refresh which will reapply the theme
    window.location.href = newPath;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('language_title')}</CardTitle>
        <CardDescription>{t('language_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('current_language_label')}</label>
            <Select value={currentLocale} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('select_language')} />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
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
