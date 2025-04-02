import { PageHeader } from '@/components/layout/PageHeader';

interface FeaturePageContainerProps {
  title: string;
  description: string;
  actions: React.ReactNode;
  children: React.ReactNode;
}

export function FeaturePageContainer({
  title,
  description,
  actions,
  children,
}: FeaturePageContainerProps) {
  return (
    <div className="flex-1 mx-auto space-y-2" data-page-content="container">
      {/* Header Section */}
      <div className="">
        <PageHeader title={title} description={description}>
          {actions}
        </PageHeader>
      </div>

      {/* Content Container - Uses CSS variables for consistent height */}
      <div className="overflow-auto h-[calc(100vh-var(--header-height)-8rem)]">{children}</div>
    </div>
  );
}
