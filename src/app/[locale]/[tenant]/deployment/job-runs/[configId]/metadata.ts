'use server';

import { getJobRunsForConfig } from '@/app/actions/jobsAction';

export async function generateMetadata({ params }: { params: { configId: string } }) {
  // Await the entire params object
  const awaitedParams = await params;
  const { configId } = awaitedParams;
  const result = await getJobRunsForConfig(configId);

  return {
    title: result.success ? `Job Runs - ${result.configName || 'Job Configuration'}` : 'Job Runs',
    description: 'View job run history',
  };
}
