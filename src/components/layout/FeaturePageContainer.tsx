import { PageHeader } from '@/components/layout/PageHeader';

interface FeaturePageContainerProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FeaturePageContainer({
  title = '',
  description = '',
  actions = null,
  children,
  className = '',
}: FeaturePageContainerProps) {
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
