import { useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { ResourceCard } from '@/components/ui/resource-card';

export default function TeamOverview() {
  const t = useTranslations('team');
  // Create resource cards for the overview
  const resourceCards = [
    {
      type: 'repository',
      name: t('resources.repositories'),
      count: 0,
    },
    {
      type: 'host',
      name: t('resources.hosts'),
      count: 0,
    },
    {
      type: 'cicd',
      name: t('resources.cicd'),
      count: 0,
    },
    {
      type: 'deployment',
      name: t('resources.deployments'),
      count: 0,
    },
  ];

  return (
    <div className="space-y-6">
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
