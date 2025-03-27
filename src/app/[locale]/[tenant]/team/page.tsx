import { Metadata } from 'next';
import { getUser } from '@/app/actions/user';
import { getTeams } from '../team/actions';
import TeamPageContent from './_components/TeamPageContent';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Team Management',
  description: 'Manage teams and team members',
};

export default async function TeamPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const teamsResult = await getTeams();
  const teams = teamsResult.success ? teamsResult.data : [];

  return (
    <div className="container mx-auto py-6 space-x-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">Manage teams, members, and resource limits</p>
      </div>
    </div>
  );
}
