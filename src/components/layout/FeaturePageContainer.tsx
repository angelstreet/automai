'use client';

import React from 'react';

import { PageHeader } from '@/components/layout/PageHeader';

export interface PageMetadata {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

interface FeaturePageContainerProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pageMetadata?: PageMetadata;
}

interface ComponentWithPageMetadata {
  pageMetadata?: PageMetadata;
  children?: React.ReactNode;
}

/**
 * FeaturePageContainer provides consistent layout for feature pages
 *
 * It accepts metadata in three ways (in order of precedence):
 * 1. Direct props (title, description, actions)
 * 2. pageMetadata prop object
 * 3. Child component's pageMetadata prop
 *
 * This allows for maximum flexibility while keeping the API simple.
 */
export function FeaturePageContainer({
  title: propTitle,
  description: propDescription,
  actions: propActions,
  children,
  className = '',
  pageMetadata,
}: FeaturePageContainerProps) {
  // Extract metadata from props and children (recursively if needed)
  const extractChildMetadata = (child: React.ReactNode): PageMetadata | null => {
    if (!React.isValidElement<ComponentWithPageMetadata>(child)) return null;

    // Direct pageMetadata prop on the child
    if (child.props.pageMetadata) {
      return child.props.pageMetadata;
    }

    // Special handling for Suspense and similar wrapping components
    // This handles the case when a page wraps content in Suspense
    if (child.props.children && React.isValidElement(child.props.children)) {
      return extractChildMetadata(child.props.children);
    }

    return null;
  };

  const childMetadata = extractChildMetadata(children);

  // For debugging:
  // console.log('FeaturePageContainer metadata:', {
  //   propTitle,
  //   propDescription,
  //   pageMetadata,
  //   childMetadata
  // });

  // Determine which metadata to use based on priority
  const title = propTitle || pageMetadata?.title || childMetadata?.title || '';
  const description =
    propDescription || pageMetadata?.description || childMetadata?.description || '';
  const actions = propActions || pageMetadata?.actions || childMetadata?.actions || null;

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
