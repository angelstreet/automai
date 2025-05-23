import { getTranslations } from 'next-intl/server';

import CodeContent from './_components/CodeContent';

export default async function CodePage() {
  const t = await getTranslations('code');

  // Direct layout without FeaturePageContainer to avoid scroll interference
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('desc')}</p>
          </div>
        </div>
      </div>

      {/* Content - Full height with no overflow */}
      <div className="flex-1 overflow-hidden">
        <CodeContent />
      </div>
    </div>
  );
}
