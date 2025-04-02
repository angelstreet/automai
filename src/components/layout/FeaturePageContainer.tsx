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
  // Get metadata from props, pageMetadata prop, or child's pageMetadata prop
  const childMetadata = React.isValidElement(children) && 
    children.props && children.props.pageMetadata ? 
    children.props.pageMetadata : null;
  
  // Determine which metadata to use based on priority
  const title = propTitle || pageMetadata?.title || childMetadata?.title || '';
  const description = propDescription || pageMetadata?.description || childMetadata?.description || '';
  const actions = propActions || pageMetadata?.actions || childMetadata?.actions || null;

  return (
    <div className={`flex-1 mx-auto space-y-2 ${className}`} data-page-content="container">
      {/* Header Section - Only render if title or description is provided */}
      {(title || description || actions) && (
        <div className="">
          <PageHeader title={title} description={description}>
            {actions}
          </PageHeader>
        </div>
      )}

      {/* Content Container - Uses CSS variables for consistent height */}
      <div className="overflow-auto h-[calc(100vh-var(--header-height)-8rem)]">{children}</div>
    </div>
  );
}
