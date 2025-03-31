import { DashboardHeaderClient } from './_components/client/DashboardHeaderClient';
import { DashboardTabsClient } from './_components/client/DashboardTabsClient';

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 py-6 px-4">
      <DashboardHeaderClient />
      <DashboardTabsClient />
    </div>
  );
}
