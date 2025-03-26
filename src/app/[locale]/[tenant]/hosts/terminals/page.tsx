import { Suspense } from 'react';
import TerminalContainer from './_components/TerminalContainer';
import TerminalSkeleton from './_components/TerminalSkeleton';

export default function TerminalsPage({
  searchParams
}: {
  searchParams: { host?: string }
}) {
  const hostId = searchParams.host;
  
  if (!hostId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Missing Host ID</h2>
          <p className="text-gray-600">No host ID provided. Please select a host first.</p>
          <a 
            href="../hosts"
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 inline-block"
          >
            Go to Hosts
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen bg-background">
      <Suspense fallback={<TerminalSkeleton />}>
        <TerminalContainer hostId={hostId} />
      </Suspense>
    </div>
  );
}
