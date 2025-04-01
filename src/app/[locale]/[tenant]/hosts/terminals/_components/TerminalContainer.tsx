import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getHostById } from '@/app/actions/hostsAction';

import TerminalSkeleton from './TerminalSkeleton';
import ClientTerminal from './client/ClientTerminal';

interface TerminalContainerProps {
  hostId: string;
}

export default async function TerminalContainer({ hostId }: TerminalContainerProps) {
  // Fetch host data from the server
  const hostResponse = await getHostById(hostId);

  if (!hostResponse.success || !hostResponse.data) {
    return notFound();
  }

  const host = hostResponse.data;

  return (
    <div className="flex flex-col h-full w-full">
      <Suspense fallback={<TerminalSkeleton />}>
        <ClientTerminal host={host} />
      </Suspense>
    </div>
  );
}
