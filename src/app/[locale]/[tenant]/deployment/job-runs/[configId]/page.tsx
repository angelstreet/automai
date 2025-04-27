'use server';

import { notFound } from 'next/navigation';
import React from 'react';

import { getJobRunsForConfig } from '@/app/actions/jobsAction';

import { JobRunsContent } from './_components/JobRunsContent';
import { JobRunsSkeleton } from './_components/JobRunsSkeleton';

// Metadata function moved to a separate file

export default async function JobRunsPage({ params }: { params: { configId: string } }) {
  // Await the entire params object
  const awaitedParams = await params;
  const { configId } = awaitedParams;

  if (!configId) {
    return notFound();
  }

  // Fetch job runs data
  const jobRunsResult = await getJobRunsForConfig(configId);

  if (!jobRunsResult.success) {
    // You might want to handle this error differently
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">Job Runs</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Failed to load job runs: {jobRunsResult.error}</p>
        </div>
      </div>
    );
  }

  // Render the content
  return (
    <React.Suspense fallback={<JobRunsSkeleton />}>
      <JobRunsContent
        jobRuns={jobRunsResult.data || []}
        configId={configId}
        configName={jobRunsResult.configName || ''}
      />
    </React.Suspense>
  );
}
