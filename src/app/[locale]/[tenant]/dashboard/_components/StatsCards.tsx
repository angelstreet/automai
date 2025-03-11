'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { useEffect, useState } from 'react';

export function StatsCards() {
  type DashboardStats = {
    projects: number;
    testCases: number;
    testsRun: number;
    successRate: number;
  };

  const [stats, setStats] = useState<DashboardStats>({
    projects: 0,
    testCases: 0,
    testsRun: 0,
    successRate: 0,
  });

  useEffect(() => {
    // Using static demo data instead of server calls
    const staticStats = {
      projects: 12,
      testCases: 180,
      testsRun: 1023,
      successRate: 92,
    };

    setStats(staticStats);
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.projects}</div>
          <p className="text-xs text-muted-foreground">Total projects</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Test Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.testCases}</div>
          <p className="text-xs text-muted-foreground">Total test cases</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tests Run</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.testsRun}</div>
          <p className="text-xs text-muted-foreground">Total tests run</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.successRate}%</div>
          <p className="text-xs text-muted-foreground">Average success rate</p>
        </CardContent>
      </Card>
    </div>
  );
}
