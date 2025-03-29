import { useTranslations } from 'next-intl';
import { UnassignedResourcesList } from '@/app/[locale]/[tenant]/team/_components/client/UnassignedResourcesList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { ResourceCard } from '@/components/ui/resource-card';

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
  unassignedResources,
}: {
  team?: TeamDetails;
  unassignedResources: UnassignedResources;
}) {
  const hasUnassignedRepos = unassignedResources?.repositories?.length > 0;

  // Create resource cards for the overview
  const resourceCards = [
    {
      type: 'repository',
      name: 'Repositories',
      count: 0,
      status: 'inactive',
    },
    {
      type: 'host',
      name: 'Hosts',
      count: 0,
      status: 'inactive',
    },
    {
      type: 'cicd',
      name: 'CI/CD',
      count: 0,
      status: 'inactive',
    },
    {
      type: 'deployment',
      name: 'Deployments',
      count: 0,
      status: 'inactive',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Resources Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Resources</CardTitle>
          <CardDescription>Overview of team resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {resourceCards.map((resource) => (
              <ResourceCard key={resource.type} resource={resource} />
            ))}
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
              teamId={null}
              teamName=""
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
