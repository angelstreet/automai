import { useTranslations } from 'next-intl';

export default function SettingsPage({
  params
}: {
  params: { tenant: string; locale: string }
}) {
  const t = useTranslations('Settings');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <div className="grid gap-6">
        {/* Settings sections will go here */}
        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t('generalSettings')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>
    </div>
  );
} 