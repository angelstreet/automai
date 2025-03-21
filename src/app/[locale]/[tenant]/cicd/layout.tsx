'use client';

import React from 'react';
// Layout not needed anymore - removing context provider since it's handled by AppContext
export default function CICDLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>{children}</>
  );
} 