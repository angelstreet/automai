'use client';

import React from 'react';
// Removing RepositoryProvider since it's now handled by AppContext

export default function RepositoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>{children}</>
  );
} 