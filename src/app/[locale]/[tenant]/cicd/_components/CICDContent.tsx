import { useContext } from 'react';
import { CICDContext } from '@/context/CICDContext';
import CICDTableClient from './client/CICDTableClient';

// This component uses the event-based refresh system similar to Hosts feature
// The CICDProvider context listens for refresh events and updates the providers list
export default function CICDContent() {
  // Use the context directly - business logic should be in the useCICD hook
  const { providers, isLoading } = useContext(CICDContext);

  return (
    <div className="w-full border-0 shadow-none">
      <CICDTableClient initialProviders={providers} isLoading={isLoading} />
    </div>
  );
}
