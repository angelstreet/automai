import { getTeamEnvironmentVariables } from '@/app/actions/environmentVariablesAction';

import { EnvironmentVariablesContentClient } from './_components/client/EnvironmentVariablesContentClient';

interface EnvironmentVariablesContentProps {
  teamId: string;
}

export async function EnvironmentVariablesContent({ teamId }: EnvironmentVariablesContentProps) {
  // Fetch environment variables from server action
  const result = await getTeamEnvironmentVariables(teamId);

  // Pass the data to the client component
  return <EnvironmentVariablesContentClient initialData={result.data || []} teamId={teamId} />;
}
