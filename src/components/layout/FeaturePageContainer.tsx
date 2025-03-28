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
    <div className="container mx-auto py-6 px-4">
      {/* Header Section */}
      <div className="mb-8">
        <PageHeader title={title} description={description}>
          {actions}
        </PageHeader>
      </div>

      {/* Content Container */}
      <div className="border rounded-lg overflow-auto h-[calc(100vh-250px)]">{children}</div>
    </div>
  );
}
