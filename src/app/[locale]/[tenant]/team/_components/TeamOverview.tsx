import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { UnassignedResourcesList } from './client/UnassignedResourcesList';

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
  const hasUnassignedRepos = unassignedResources.repositories.length > 0;

  return (
    <div className="space-y-6">
      {/* Team Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{team.id ? team.name : 'No Team'}</CardTitle>
          <CardDescription>
            {team.id
              ? `Subscription tier: ${team.subscription_tier}`
              : 'No team associated with this account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Members</span>
              <span className="text-2xl font-semibold">{team.memberCount}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Your Role</span>
              <span className="text-2xl font-semibold">{team.userRole || 'N/A'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-2xl">{team.resourceCounts.repositories}</p>
              {hasUnassignedRepos && (
                <p className="text-sm text-amber-500">
                  {unassignedResources.repositories.length} unassigned
                </p>
              )}
            </div>
            <div className="p-4 border rounded-md">
              <h3 className="font-medium">Hosts</h3>
              <p className="text-2xl">{team.resourceCounts.hosts}</p>
            </div>
            <div className="p-4 border rounded-md">
              <h3 className="font-medium">CI/CD</h3>
              <p className="text-2xl">{team.resourceCounts.cicd}</p>
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
              teamId={team.id}
              teamName={team.name}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
