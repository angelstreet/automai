'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

export default function ScriptsPage() {
  const params = useParams();
  const t = useTranslations('Scripts');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <div className="grid gap-6">
        {/* Scripts list will go here */}
        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t('scriptsList')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>
    </div>
  );
}
