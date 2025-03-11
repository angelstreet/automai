import { useTranslations } from 'next-intl';

export default function BillingPage() {
  const t = useTranslations('billing');

  return (
    <div>
      <h1>{t('title')}</h1>
    </div>
  );
}
