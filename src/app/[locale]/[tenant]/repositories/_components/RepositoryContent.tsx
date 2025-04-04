import { Card, CardContent } from '@/components/shadcn/card';

import { RepositoryListClient } from './client/RepositoryListClient';

export async function RepositoryContent() {
  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent>
        <RepositoryListClient />
      </CardContent>
    </Card>
  );
}
