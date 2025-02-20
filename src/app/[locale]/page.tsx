import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('Index');
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold">{t('title')}</h1>
        <p className="mt-4 text-xl">
          {t('description')}
        </p>
      </div>
    </main>
  );
}