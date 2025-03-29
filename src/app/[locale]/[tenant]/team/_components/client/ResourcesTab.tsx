'use client';

import { useEffect, useState } from 'react';
import { Code, GitBranch, Rocket, Server } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TeamDetails } from '../../types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { User } from '@/types/user';
import ResourcesTabSkeleton from '../ResourcesTabSkeleton';

// Mock resource data types
interface Host {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline' | 'maintenance';
}

interface Repository {
  id: string;
  name: string;
  url: string;
  isPublic: boolean;
}

interface CICDPipeline {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'failed';
  type: 'github' | 'gitlab' | 'jenkins' | 'custom';
}

interface Deployment {
  id: string;
  name: string;
  environment: string;
  status: 'deployed' | 'pending' | 'failed';
}

interface ResourcesTabProps {
  teamDetails: Partial<TeamDetails>;
  user?: User | null;
}

export function ResourcesTab({ teamDetails, user }: ResourcesTabProps) {
  const t = useTranslations('team');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - Replace with actual data fetching
  const hosts: Host[] = [
    { id: 'h1', name: 'Production Server', ip: '192.168.1.1', status: 'online' },
    { id: 'h2', name: 'Development Server', ip: '192.168.1.2', status: 'online' },
  ];

  const repositories: Repository[] = [
    { id: 'r1', name: 'Main App', url: 'https://github.com/org/main-app', isPublic: false },
    { id: 'r2', name: 'Documentation', url: 'https://github.com/org/docs', isPublic: true },
  ];

  const cicdPipelines: CICDPipeline[] = [
    { id: 'c1', name: 'Main App Build', status: 'active', type: 'github' },
    { id: 'c2', name: 'Deploy Pipeline', status: 'inactive', type: 'jenkins' },
  ];

  const deployments: Deployment[] = [
    { id: 'd1', name: 'Frontend v1.2', environment: 'production', status: 'deployed' },
    { id: 'd2', name: 'Backend v2.0', environment: 'staging', status: 'pending' },
  ];

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'deployed':
        return 'text-green-500';
      case 'offline':
      case 'inactive':
      case 'pending':
        return 'text-yellow-500';
      case 'maintenance':
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return <ResourcesTabSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Hosts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              {t('resources.hosts')}
            </CardTitle>
            <CardDescription>
              {hosts.length} {hosts.length === 1 ? 'server' : 'servers'} available
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('resources.name')}</TableHead>
                  <TableHead>{t('resources.ip')}</TableHead>
                  <TableHead>{t('resources.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hosts.map((host) => (
                  <TableRow key={host.id}>
                    <TableCell>{host.name}</TableCell>
                    <TableCell>{host.ip}</TableCell>
                    <TableCell className={getStatusColor(host.status)}>{host.status}</TableCell>
                  </TableRow>
                ))}
                {hosts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      {t('resources.noResources')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Repositories Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              {t('resources.repositories')}
            </CardTitle>
            <CardDescription>
              {repositories.length} {repositories.length === 1 ? 'repository' : 'repositories'}{' '}
              available
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('resources.name')}</TableHead>
                  <TableHead>{t('resources.url')}</TableHead>
                  <TableHead>{t('resources.visibility')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repositories.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell>{repo.name}</TableCell>
                    <TableCell>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {repo.url}
                      </a>
                    </TableCell>
                    <TableCell>{repo.isPublic ? 'Public' : 'Private'}</TableCell>
                  </TableRow>
                ))}
                {repositories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      {t('resources.noResources')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* CI/CD Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              {t('resources.cicd')}
            </CardTitle>
            <CardDescription>
              {cicdPipelines.length} {cicdPipelines.length === 1 ? 'pipeline' : 'pipelines'}{' '}
              available
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('resources.name')}</TableHead>
                  <TableHead>{t('resources.type')}</TableHead>
                  <TableHead>{t('resources.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cicdPipelines.map((pipeline) => (
                  <TableRow key={pipeline.id}>
                    <TableCell>{pipeline.name}</TableCell>
                    <TableCell className="capitalize">{pipeline.type}</TableCell>
                    <TableCell className={getStatusColor(pipeline.status)}>
                      {pipeline.status}
                    </TableCell>
                  </TableRow>
                ))}
                {cicdPipelines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      {t('resources.noResources')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Deployments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              {t('resources.deployments')}
            </CardTitle>
            <CardDescription>
              {deployments.length} {deployments.length === 1 ? 'deployment' : 'deployments'}{' '}
              available
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('resources.name')}</TableHead>
                  <TableHead>{t('resources.environment')}</TableHead>
                  <TableHead>{t('resources.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deployments.map((deployment) => (
                  <TableRow key={deployment.id}>
                    <TableCell>{deployment.name}</TableCell>
                    <TableCell className="capitalize">{deployment.environment}</TableCell>
                    <TableCell className={getStatusColor(deployment.status)}>
                      {deployment.status}
                    </TableCell>
                  </TableRow>
                ))}
                {deployments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      {t('resources.noResources')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
