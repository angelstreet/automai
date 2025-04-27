'use client';

import { ArrowLeft, Eye, Filter, RefreshCw, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { Input } from '@/components/shadcn/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { useToast } from '@/components/shadcn/use-toast';
import { getFormattedTime } from '@/lib/utils/deploymentUtils';

import { JobRunStatusBadge } from './JobRunStatusBadge';

interface JobRun {
  id: string;
  configId: string;
  status: string;
  output: any;
  logs: any;
  error: string | null | undefined;
  createdAt: string;
  updatedAt?: string;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  executionParameters?: any;
  scheduledTime?: string;
  workerId?: string;
  executionAttempt?: number;
  executionNumber?: number;
  configName?: string;
}

interface JobRunsContentProps {
  jobRuns: JobRun[];
  configId: string;
  configName: string;
}

export function JobRunsContent({ jobRuns, configId: _configId, configName }: JobRunsContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('deployment');
  const c = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle back button click
  const handleBack = () => {
    // Get the locale and tenant from the URL
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0] || 'en';
    const tenant = segments[1] || 'trial';

    // Navigate back to the deployments page with the correct path
    router.push(`/${locale}/${tenant}/deployment`);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setIsRefreshing(true);

    // Refresh the page
    router.refresh();

    // Reset the refreshing state after a short delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Handle view job run details
  const handleViewJobRun = (jobRun: JobRun) => {
    // For now just show a toast with basic details
    // Later, you could navigate to a detailed view page
    toast({
      title: `Job Run #${jobRun.executionNumber || '-'}`,
      description: `Status: ${jobRun.status}, Started: ${jobRun.startedAt ? new Date(jobRun.startedAt).toLocaleString() : 'N/A'}, Completed: ${jobRun.completedAt ? new Date(jobRun.completedAt).toLocaleString() : 'N/A'}${jobRun.error ? ', Error: ' + jobRun.error : ''}`,
    });
  };

  // Filter job runs based on search query and status filter
  const filteredJobRuns = jobRuns.filter((run) => {
    const matchesSearch =
      searchQuery === '' ||
      run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (run.workerId && run.workerId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (run.error && run.error.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get unique statuses for the filter dropdown
  const uniqueStatuses = Array.from(new Set(jobRuns.map((run) => run.status)));

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {c('back')}
          </Button>
          <h1 className="text-xl font-bold">{configName}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {c('refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg">{t('job_run_history')}</CardTitle>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={c('search_placeholder')}
                  className="pl-8 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {c('status')}: {statusFilter === 'all' ? c('all') : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    {c('all')}
                  </DropdownMenuItem>
                  {uniqueStatuses.map((status) => (
                    <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredJobRuns.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">#</TableHead>
                    <TableHead>{c('status')}</TableHead>
                    <TableHead>{c('status_running')}</TableHead>
                    <TableHead>{c('status_completed')}</TableHead>
                    <TableHead>{c('duration')}</TableHead>
                    <TableHead className="w-[100px] text-right">{c('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobRuns.map((jobRun) => (
                    <TableRow key={jobRun.id}>
                      <TableCell className="font-medium">{jobRun.executionNumber || '-'}</TableCell>
                      <TableCell>
                        <JobRunStatusBadge status={jobRun.status} />
                      </TableCell>
                      <TableCell>
                        {jobRun.startedAt
                          ? getFormattedTime
                            ? getFormattedTime(jobRun.startedAt)
                            : new Date(jobRun.startedAt).toLocaleString()
                          : 'Not started'}
                      </TableCell>
                      <TableCell>
                        {jobRun.completedAt
                          ? getFormattedTime
                            ? getFormattedTime(jobRun.completedAt)
                            : new Date(jobRun.completedAt).toLocaleString()
                          : 'Not completed'}
                      </TableCell>
                      <TableCell>
                        {jobRun.startedAt && jobRun.completedAt
                          ? getFormattedTime
                            ? getFormattedTime(jobRun.startedAt, jobRun.completedAt)
                            : `${Math.round((new Date(jobRun.completedAt).getTime() - new Date(jobRun.startedAt).getTime()) / 1000 / 60)} min`
                          : jobRun.startedAt && !jobRun.completedAt
                            ? 'Running...'
                            : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleViewJobRun(jobRun)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
                <RefreshCw className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                {t('no_jobs_found')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || statusFilter !== 'all'
                  ? t('wizard_try_refreshing')
                  : t('no_jobs_desc')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
