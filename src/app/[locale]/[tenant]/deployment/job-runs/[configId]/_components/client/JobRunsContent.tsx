'use client';

import { ArrowLeft, Eye, Filter, RefreshCw, Search, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect, useRef } from 'react';

import { JobRunOutputDialogClient } from '@/app/[locale]/[tenant]/deployment/_components/client/JobRunOutputDialogClient';
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
import { getFormattedTime } from '@/lib/utils/deploymentUtils';

import { JobRunStatusBadge } from '../JobRunStatusBadge';

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
  report_url?: string;
}

interface JobRunsContentProps {
  jobRuns: JobRun[];
  configId: string;
  configName: string;
}

export function JobRunsContent({ jobRuns, configId: _configId, configName }: JobRunsContentProps) {
  const router = useRouter();
  const t = useTranslations('deployment');
  const c = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJobRun, setSelectedJobRun] = useState<JobRun | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  // Setup auto-refresh interval
  useEffect(() => {
    console.log(
      `[@component:JobRunsContent] Auto-refresh ${autoRefreshEnabled ? 'enabled' : 'disabled'}`,
    );

    if (autoRefreshEnabled) {
      // Clear any existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up new interval for 30 seconds
      refreshIntervalRef.current = setInterval(() => {
        console.log('[@component:JobRunsContent] Auto-refreshing job runs data');
        router.refresh();
      }, 30000); // 30 seconds
    } else if (refreshIntervalRef.current) {
      // Clear interval if auto-refresh is disabled
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Cleanup on component unmount
    return () => {
      if (refreshIntervalRef.current) {
        console.log('[@component:JobRunsContent] Cleaning up auto-refresh interval');
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, router]);

  // Handle view job run details
  const handleViewJobRun = (jobRun: JobRun) => {
    setSelectedJobRun(jobRun);
    setIsModalOpen(true);
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
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAutoRefresh}
            className={
              autoRefreshEnabled
                ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50'
                : ''
            }
          >
            {autoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {c('refresh')}
          </Button>
        </div>
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
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-border/50">
                    <TableHead className="py-1 text-xs">#</TableHead>
                    <TableHead className="py-1 text-xs">{c('status')}</TableHead>
                    <TableHead className="py-1 text-xs">{c('status_running')}</TableHead>
                    <TableHead className="py-1 text-xs">{c('status_completed')}</TableHead>
                    <TableHead className="py-1 text-xs">{c('duration')}</TableHead>
                    <TableHead className="py-1 text-xs text-right">{c('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobRuns.map((jobRun, index) => (
                    <TableRow key={jobRun.id} className="border-0 hover:bg-muted/30">
                      <TableCell className="py-0.5 font-medium text-xs">{index + 1}</TableCell>
                      <TableCell className="py-0.5 text-xs">
                        <JobRunStatusBadge status={jobRun.status} />
                      </TableCell>
                      <TableCell className="py-0.5 text-xs">
                        {jobRun.startedAt
                          ? getFormattedTime
                            ? getFormattedTime(jobRun.startedAt)
                            : new Date(jobRun.startedAt).toLocaleString()
                          : 'Not started'}
                      </TableCell>
                      <TableCell className="py-0.5 text-xs">
                        {jobRun.completedAt
                          ? getFormattedTime
                            ? getFormattedTime(jobRun.completedAt)
                            : new Date(jobRun.completedAt).toLocaleString()
                          : 'Not completed'}
                      </TableCell>
                      <TableCell className="py-0.5 text-xs">
                        {jobRun.startedAt && jobRun.completedAt
                          ? getFormattedTime
                            ? getFormattedTime(jobRun.startedAt, jobRun.completedAt)
                            : `${Math.round((new Date(jobRun.completedAt).getTime() - new Date(jobRun.startedAt).getTime()) / 1000 / 60)} min`
                          : jobRun.startedAt && !jobRun.completedAt
                            ? 'Running...'
                            : 'N/A'}
                      </TableCell>
                      <TableCell className="py-0.5 text-xs text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewJobRun(jobRun)}>
                              <Eye className="h-3 w-3 mr-2" />
                              {c('view_output')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (jobRun.report_url) {
                                  window.open(jobRun.report_url, '_blank');
                                } else {
                                  console.log(
                                    '[@component:JobRunsContent] No report URL available for job run:',
                                    jobRun.id,
                                  );
                                }
                              }}
                              disabled={!jobRun.report_url}
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              {c('view_report')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Job output modal */}
      <JobRunOutputDialogClient
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        jobRun={selectedJobRun}
      />
    </div>
  );
}
