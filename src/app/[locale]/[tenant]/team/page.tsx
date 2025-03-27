import { Metadata } from 'next';


export const metadata: Metadata = {
  title: 'Team Management',
  description: 'Manage teams and team members',
};

export default async function TeamPage() {

  return (
    <div className="container mx-auto py-6 space-x-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">Manage teams, members, and resource limits</p>
      </div>
    </div>
  );
}
