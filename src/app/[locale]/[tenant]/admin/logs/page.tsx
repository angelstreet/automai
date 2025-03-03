'use client';

import { InfoIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

// Define a simplified interface for logs (_even though we won't use it)
interface ConnectionLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  action: string | null;
  userId: string | null;
  tenantId: string | null;
  connectionId: string | null;
  ip: string | null;
  metadata: any;
}

export default function LogsPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [loading, setLoading] = useState(_false);

  if (!session) {
    return <div className="flex justify-center p-8">Please sign in to access this page</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Connection Logs</CardTitle>
          <CardDescription>View and filter connection activity logs</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Logs Unavailable</AlertTitle>
            <AlertDescription>
              Connection logging has been disabled in this version. The ConnectionLog model has been
              removed from the database schema.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
