'use client';

import { SettingsHeader } from '@/components/settings/settings-header';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <SettingsHeader
        title="Settings"
        description="Manage your account settings and preferences."
      />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
