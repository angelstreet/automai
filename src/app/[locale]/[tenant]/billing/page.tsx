import { useTranslations } from 'next-intl';

export default function BillingPage({ params }: { params: { tenant: string; locale: string } }) {
  const t = useTranslations('billing');

  return (
    <div>
      <h1>{t('title')}</h1>
    </div>
  );
}
