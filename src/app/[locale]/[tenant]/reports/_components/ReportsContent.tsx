import { ReactNode } from 'react';
import { WithPageMetadata } from '@/components/layout/PageMetadata';

interface ReportsContentProps extends WithPageMetadata {}

export function ReportsContent({ pageMetadata }: ReportsContentProps = {}) {
  return (
    <div className="p-4">
      <p>Reports will be available here.</p>
    </div>
  );
}