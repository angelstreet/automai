import { DashboardHeaderClient } from './_components/client/DashboardHeaderClient';
import { DashboardTabsClient } from './_components/client/DashboardTabsClient';

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-2">
      <DashboardHeaderClient />
      <DashboardTabsClient />
    </div>
  );
}
