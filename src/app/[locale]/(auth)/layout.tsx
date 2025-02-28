'use client';

import * as React from 'react';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}
