'use client';

import React from 'react';

import { PageHeader } from '@/components/layout/PageHeader';

interface FeaturePageContainerProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * FeaturePageContainer provides consistent layout for feature pages
 */
export function FeaturePageContainer({
  title = '',
  description = '',
  actions = null,
  children,
  className = '',
}: FeaturePageContainerProps) {
  return (
    <div className={`flex-1 flex flex-col h-[calc(100vh-4rem)] ${className} px-6 py-4`}>
      {/* Header Section - Only render if title or description is provided */}
      {(title || description || actions) && (
        <div className="mb-2">
          <PageHeader title={title} description={description}>
            {actions}
          </PageHeader>
        </div>
      )}

      {/* Content Container - Let the parent container handle scrolling */}
      <div className="flex-1 overflow-visible pb-4">{children}</div>
    </div>
  );
}
