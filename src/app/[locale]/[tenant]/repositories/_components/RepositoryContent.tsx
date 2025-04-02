import { Card, CardContent } from '@/components/shadcn/card';

import { ClientRepositoryList } from './client/ClientRepositoryList';

export async function RepositoryContent() {
  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent>
        <ClientRepositoryList />
      </CardContent>
    </Card>
  );
}
