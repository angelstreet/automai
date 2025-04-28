import { Team } from '@/types/context/teamContextType';

import { ReportsContentClient } from './client/ReportsContentClient';

interface ReportsContentProps {
  teamDetails: Team | null;
}

export function ReportsContent({ teamDetails }: ReportsContentProps) {
  return <ReportsContentClient teamDetails={teamDetails} />;
}
