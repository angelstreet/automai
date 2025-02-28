import { useTranslations } from 'next-intl';

interface Props {
  params: {
    tenant: string;
    locale: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ReportsPage(props: Props) {
  const t = useTranslations('Reports');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <div className="grid gap-6">
        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t('reportsList')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>
    </div>
  );
}
