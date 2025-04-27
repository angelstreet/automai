import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

import { ReportsContentClient } from './client/ReportsContentClient';

interface ReportsContentProps {
  user: User | null;
  teamDetails: Team | null;
}

export function ReportsContent({ user, teamDetails }: ReportsContentProps) {
  return <ReportsContentClient user={user} teamDetails={teamDetails} />;
}
