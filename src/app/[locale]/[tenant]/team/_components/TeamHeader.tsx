'use client';

import { PlusIcon, Settings } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

interface TeamDetails {
  id: string | null;
  name: string;
  subscription_tier: string;
  memberCount: number;
  userRole?: string;
  ownerId: string;
  resourceCounts: {
    repositories: number;
    hosts: number;
    cicd: number;
  };
}

export default function TeamHeader({ team, activeTab }: { team: TeamDetails; activeTab: string }) {
  const hasTeam = Boolean(team.id);
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        {/* Team Selector */}
        <div className="flex items-center">
          <div className="bg-primary/10 p-2 rounded-md mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{team.name}</h2>
            <p className="text-sm text-muted-foreground">
              {team.userRole || 'No role'}
              {team.id && <span className="ml-1">- {team.id}</span>}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 items-center">
          {hasTeam && team.subscription_tier !== 'trial' && (
            <>
              <Button variant="outline" size="sm" disabled={!hasTeam}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Member
              </Button>
              <Button variant="outline" size="sm" disabled={!hasTeam}>
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </>
          )}
          {!hasTeam && (
            <Button variant="default" size="sm">
              <PlusIcon className="h-4 w-4 mr-1" />
              Create Team
            </Button>
          )}
        </div>
      </div>

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
              {team.resourceCounts.repositories +
                team.resourceCounts.hosts +
                team.resourceCounts.cicd}
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

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
