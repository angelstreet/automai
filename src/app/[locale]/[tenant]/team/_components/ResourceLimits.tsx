'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { Progress } from '@/components/shadcn/progress';
import { useTeam } from '@/context';
import { useUser } from '@/context';
import type { ResourceLimit } from '@/types/context/team';

export default function ResourceLimits() {
  const { user } = useUser();
  const { checkResourceLimit } = useTeam();
  const [limits, setLimits] = useState<ResourceLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resourceTypes = ['hosts', 'repositories', 'deployments', 'cicd_providers'];
  const resourceNames: Record<string, string> = {
    hosts: 'Hosts',
    repositories: 'Repositories',
    deployments: 'Deployments',
    cicd_providers: 'CI/CD Providers'
  };

  useEffect(() => {
    const fetchLimits = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const results = await Promise.all(
          resourceTypes.map(async (type) => {
            const result = await checkResourceLimit(type);
            return result ? { ...result } : null;
          })
        );
        
        setLimits(results.filter(Boolean) as ResourceLimit[]);
      } catch (err) {
        setError('Failed to load resource limits');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLimits();
  }, [user, checkResourceLimit]);

  if (loading) {
    return <div>Loading resource limits...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Limits</CardTitle>
        <CardDescription>
          Current usage and limits for your subscription tier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Resource Type</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {limits.map((resource) => (
              <TableRow key={resource.type}>
                <TableCell className="font-medium">
                  {resourceNames[resource.type] || resource.type}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs">
                      <span>
                        {resource.current} / {resource.isUnlimited ? 'Unlimited' : resource.limit}
                      </span>
                      <span className={resource.current >= resource.limit && !resource.isUnlimited ? 'text-red-500' : ''}>
                        {resource.isUnlimited 
                          ? '∞' 
                          : `${Math.min(Math.round((resource.current / resource.limit) * 100), 100)}%`}
                      </span>
                    </div>
                    <Progress 
                      value={resource.isUnlimited ? 10 : Math.min((resource.current / resource.limit) * 100, 100)}
                      className={resource.current >= resource.limit && !resource.isUnlimited ? 'text-red-500' : ''}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {resource.isUnlimited ? (
                    <span className="text-green-500">Unlimited</span>
                  ) : resource.current >= resource.limit ? (
                    <span className="text-red-500">Limit Reached</span>
                  ) : (
                    <span className="text-green-500">Available</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}