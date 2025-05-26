import { getTranslations } from 'next-intl/server';

export default async function VirtualPyTestContent({ pageMetadata }) {
  const t = await getTranslations('virtualpytest');

  return (
    <div className="p-2">Coming soon</div>
  );
}
