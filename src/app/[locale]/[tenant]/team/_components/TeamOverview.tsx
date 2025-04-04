import { useTranslations } from 'next-intl';

import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { ResourceCard } from '@/components/ui/resource-card';
import { TeamDetails } from '@/types/context/teamContextType';

interface TeamOverviewProps {
  team: TeamDetails | null;
}

export default function TeamOverview({ team }: TeamOverviewProps) {
  const t = useTranslations('team');
  const hasTeam = Boolean(team?.id);

  // Log team data for debugging
  console.log('TeamOverview - team:', team);

  // Ensure resourceCounts always exists by providing default values
  const resourceCounts = team?.resourceCounts || {
    repositories: 0,
    hosts: 0,
    cicd: 0,
    deployments: 0,
  };

  // Check for both cicd and cicdProviders fields to handle different data structures
  const cicdCount =
    resourceCounts.cicd !== undefined ? resourceCounts.cicd : resourceCounts.cicdProviders || 0;

  // Create resource cards for the overview
  const resourceCards = [
    {
      type: 'repository',
      name: t('resources.repositories'),
      count: resourceCounts.repositories,
    },
    {
      type: 'host',
      name: t('resources.hosts'),
      count: resourceCounts.hosts,
    },
    {
      type: 'cicd',
      name: t('resources.cicd'),
      count: cicdCount, // Use the cicdCount variable
    },
    {
      type: 'deployment',
      name: t('resources.deployments'),
      count: resourceCounts.deployments,
    },
  ];

  if (!team) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t('resources.title')}</CardTitle>
            <CardDescription>{t('resources.overview')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {resourceCards.map((resource) => (
                <ResourceCard key={resource.type} resource={resource} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Info */}
      <Card className="p-4 bg-muted/50">
        <div className="flex flex-col md:flex-row md:justify-between gap-4 text-center">
          <div>
            <p className="text-sm font-medium">Subscription</p>
            <p className="text-xl font-semibold capitalize">{team.subscription_tier}</p>
          </div>

          <div>
            <p className="text-sm font-medium">Team Members</p>
            <p className="text-xl font-semibold">{team.memberCount}</p>
          </div>

          <div>
            <p className="text-sm font-medium">Resources</p>
            <p className="text-xl font-semibold">
              {resourceCounts.repositories +
                resourceCounts.hosts +
                cicdCount + // Use the cicdCount variable
                resourceCounts.deployments}
            </p>
          </div>

          {hasTeam && (
            <div className="flex items-end">
              <Button variant="link" size="sm">
                View Billing
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Resources Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t('resources.title')}</CardTitle>
          <CardDescription>{t('resources.overview')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {resourceCards.map((resource) => (
              <ResourceCard key={resource.type} resource={resource} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
