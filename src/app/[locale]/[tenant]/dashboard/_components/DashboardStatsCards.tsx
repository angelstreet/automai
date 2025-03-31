import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export function DashboardStatsCards() {
  // Static demo data
  const stats = {
    projects: 12,
    testCases: 180,
    testsRun: 1023,
    successRate: 92,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projects</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-2xl font-bold">{stats.projects}</div>
          <p className="text-xs text-muted-foreground">Total projects</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Test Cases</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-2xl font-bold">{stats.testCases}</div>
          <p className="text-xs text-muted-foreground">Total test cases</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tests Run</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-2xl font-bold">{stats.testsRun}</div>
          <p className="text-xs text-muted-foreground">Total tests run</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-2xl font-bold">{stats.successRate}%</div>
          <p className="text-xs text-muted-foreground">Average success rate</p>
        </CardContent>
      </Card>
    </div>
  );
}
