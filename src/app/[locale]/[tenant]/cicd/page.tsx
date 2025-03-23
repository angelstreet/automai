import { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageHeader';
import { CICDProvider } from './_components';

export const metadata: Metadata = {
  title: 'CI/CD Integration',
  description: 'Configure CI/CD providers for automated deployments',
};

export default function CICDPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader 
        title="CI/CD Integration" 
        description="Configure CI/CD providers for automated deployments"
      />
      
      <CICDProvider />
    </div>
  );
} 