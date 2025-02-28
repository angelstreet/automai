import { SiteHeader } from '@/components/layout/site-header';
import React from 'react';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
