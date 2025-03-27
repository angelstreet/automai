'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { useTeam } from '@/context';
import TeamList from './TeamList';
import TeamMembers from './TeamMembers';
import ResourceLimits from './ResourceLimits';
import type { Team } from '@/types/context/team';

interface TeamPageContentProps {
  initialTeams: Team[];
}

export default function TeamPageContent({ initialTeams }: TeamPageContentProps) {
  const { teams, setTeams } = useTeam();

  // Initialize teams from server-side props
  useEffect(() => {
    if (initialTeams.length > 0 && teams.length === 0) {
      setTeams(initialTeams);
    }
  }, [initialTeams, teams.length, setTeams]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <TeamList />
      </div>

      <div className="lg:col-span-2">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="resources">Resource Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6">
            <TeamMembers />
          </TabsContent>

          <TabsContent value="resources" className="mt-6">
            <ResourceLimits />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
