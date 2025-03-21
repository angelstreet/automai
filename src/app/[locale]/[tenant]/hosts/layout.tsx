'use client';

import React from 'react';
// Removing HostProvider since it's now handled by AppContext

export default function HostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>{children}</>
  );
} 