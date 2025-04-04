import { useCICD } from '@/hooks/useCICD';
import CICDTableClient from './client/CICDTableClient';

// This component uses the CICD hook according to the architecture guidelines
export default function CICDContent() {
  // Use the hook directly instead of context
  const { providers, isLoading } = useCICD();

  return (
    <div className="w-full border-0 shadow-none">
      <CICDTableClient initialProviders={providers} isLoading={isLoading} />
    </div>
  );
}
