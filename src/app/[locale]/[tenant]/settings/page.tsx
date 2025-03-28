import { Suspense } from 'react';
import { SettingsContent, SettingsSkeleton } from './_components';

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}