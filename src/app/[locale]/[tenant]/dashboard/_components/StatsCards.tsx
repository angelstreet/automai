'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { useEffect, useState } from 'react';
import { getDashboardStats } from '../actions';

export function StatsCards() {
  const [stats, setStats] = useState({
    projects: 0,
    testCases: 0,
    testsRun: 0,
    successRate: 0,
  });

  useEffect(() => {
    // Add component name to reference
    const fetchData = async () => {
      try {
        console.log('[StatsCards] Fetching dashboard stats');
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('[StatsCards] Error fetching dashboard stats:', error);
      }
    };

    fetchData();
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
