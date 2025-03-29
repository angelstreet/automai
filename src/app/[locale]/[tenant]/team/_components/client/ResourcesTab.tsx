'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Button } from '@/components/shadcn/button';
import { DatabaseIcon, ServerIcon, GitBranchIcon, PlusIcon } from 'lucide-react';
import { UnassignedResourcesList } from './UnassignedResourcesList';

interface ResourcesTabProps {
  teamId: string | null;
  teamName?: string;
  unassignedRepositories: any[];
  resourceCounts: {
    repositories: number;
    hosts: number;
    cicd: number;
  };
}

export function ResourcesTab({
  teamId,
  teamName,
  unassignedRepositories,
  resourceCounts,
}: ResourcesTabProps) {
  const [resourceType, setResourceType] = useState('repositories');

  if (!teamId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Resources</CardTitle>
          <CardDescription>Create a team to manage resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-6">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Resources</CardTitle>
          <CardDescription>Manage resources for {teamName}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={resourceType} onValueChange={setResourceType} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="repositories" className="flex items-center">
                <GitBranchIcon className="h-4 w-4 mr-2" />
                Repositories
              </TabsTrigger>
              <TabsTrigger value="hosts" className="flex items-center">
                <ServerIcon className="h-4 w-4 mr-2" />
                Hosts
              </TabsTrigger>
              <TabsTrigger value="cicd" className="flex items-center">
                <DatabaseIcon className="h-4 w-4 mr-2" />
                CI/CD
              </TabsTrigger>
              <TabsTrigger value="deployments" className="flex items-center">
                <DatabaseIcon className="h-4 w-4 mr-2" />
                Deployments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="repositories">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Repositories</h3>
                  <p className="text-sm text-muted-foreground">
                    {resourceCounts.repositories} repositories assigned to this team
                  </p>
                </div>
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Repository
                </Button>
              </div>

              {resourceCounts.repositories === 0 ? (
                <div className="text-center p-6 border rounded-md">
                  <p className="text-muted-foreground">No repositories assigned to this team</p>
                </div>
              ) : (
                <div className="border rounded-md p-4">
                  <p className="text-center text-muted-foreground">
                    Repository list would be displayed here
                  </p>
                </div>
              )}

              {unassignedRepositories.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Unassigned Repositories</h3>
                  <UnassignedResourcesList
                    repositories={unassignedRepositories}
                    teamId={teamId}
                    teamName={teamName}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="hosts">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Hosts</h3>
                  <p className="text-sm text-muted-foreground">
                    {resourceCounts.hosts} hosts assigned to this team
                  </p>
                </div>
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Host
                </Button>
              </div>

              {resourceCounts.hosts === 0 ? (
                <div className="text-center p-6 border rounded-md">
                  <p className="text-muted-foreground">No hosts assigned to this team</p>
                </div>
              ) : (
                <div className="border rounded-md p-4">
                  <p className="text-center text-muted-foreground">
                    Host list would be displayed here
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cicd">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">CI/CD</h3>
                  <p className="text-sm text-muted-foreground">
                    {resourceCounts.cicd} CI/CD providers assigned to this team
                  </p>
                </div>
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
              </div>

              {resourceCounts.cicd === 0 ? (
                <div className="text-center p-6 border rounded-md">
                  <p className="text-muted-foreground">No CI/CD providers assigned to this team</p>
                </div>
              ) : (
                <div className="border rounded-md p-4">
                  <p className="text-center text-muted-foreground">
                    CI/CD provider list would be displayed here
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="deployments">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Deployments</h3>
                  <p className="text-sm text-muted-foreground">
                    0 deployments assigned to this team
                  </p>
                </div>
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Deployment
                </Button>
              </div>

              <div className="text-center p-6 border rounded-md">
                <p className="text-muted-foreground">No deployments found for this team</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
