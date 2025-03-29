import { UnassignedResourcesList } from '@/app/[locale]/[tenant]/team/_components/client/UnassignedResourcesList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

interface ResourceCount {
  repositories: number;
  hosts: number;
  cicd: number;
}

interface TeamDetails {
  id: string | null;
  name: string;
  subscription_tier: string;
  memberCount: number;
  userRole?: string;
  ownerId: string;
  resourceCounts: ResourceCount;
}

interface UnassignedResources {
  repositories: any[];
}

export default function TeamOverview({
  team,
  unassignedResources,
}: {
  team: TeamDetails;
  unassignedResources: UnassignedResources;
}) {
  const hasUnassignedRepos = unassignedResources?.repositories?.length > 0;
  const resourceCounts = team?.resourceCounts || { repositories: 0, hosts: 0, cicd: 0 };

  return (
    <div className="space-y-6">
      {/* Resources Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Resources</CardTitle>
          <CardDescription>Overview of team resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-md">
              <h3 className="font-medium">Repositories</h3>
              <p className="text-2xl">{resourceCounts.repositories}</p>
              {hasUnassignedRepos && (
                <p className="text-sm text-amber-500">
                  {unassignedResources.repositories.length} unassigned
                </p>
              )}
            </div>
            <div className="p-4 border rounded-md">
              <h3 className="font-medium">Hosts</h3>
              <p className="text-2xl">{resourceCounts.hosts}</p>
            </div>
            <div className="p-4 border rounded-md">
              <h3 className="font-medium">CI/CD</h3>
              <p className="text-2xl">{resourceCounts.cicd}</p>
            </div>
            <div className="p-4 border rounded-md">
              <h3 className="font-medium">Deployments</h3>
              <p className="text-2xl">0</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unassigned Resources Card */}
      {hasUnassignedRepos && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Unassigned Repositories</CardTitle>
            <CardDescription>Repositories that need to be assigned to a team</CardDescription>
          </CardHeader>
          <CardContent>
            <UnassignedResourcesList
              repositories={unassignedResources.repositories}
              teamId={team?.id}
              teamName={team?.name}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
