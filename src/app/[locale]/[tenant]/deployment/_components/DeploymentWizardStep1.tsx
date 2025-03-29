'use client';

import { RefreshCw } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';

import { Repository } from '../types';

interface DeploymentWizardStep1Props {
  name: string;
  description: string;
  repositoryId: string;
  repositories: Repository[];
  repositoryError: string | null;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onNextStep: () => void;
  isStepValid: () => boolean;
  onRefreshRepositories: () => void;
}

const DeploymentWizardStep1: React.FC<DeploymentWizardStep1Props> = ({
  name,
  description,
  repositoryId,
  repositories,
  repositoryError,
  onInputChange,
  onNextStep,
  isStepValid,
  onRefreshRepositories,
}) => {
  // Handle refreshing repositories
  const handleRefreshClick = () => {
    // Use direct SWR pattern for refreshing repositories
    onRefreshRepositories();
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-medium mb-4">Deployment Details</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Deployment Name
          </label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={onInputChange}
            placeholder="Enter deployment name"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={onInputChange}
            placeholder="Briefly describe this deployment"
            rows={3}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="repositoryId" className="block text-sm font-medium">
              Repository
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRefreshClick}
              className="h-7 px-2 text-xs flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </Button>
          </div>
          <select
            id="repositoryId"
            name="repositoryId"
            value={repositoryId}
            onChange={onInputChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          >
            <option value="">Select repository</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name} ({repo.url ? new URL(repo.url).hostname : 'Unknown'})
              </option>
            ))}
          </select>
          {repositoryError && <p className="text-sm text-red-500 mt-1">Error: {repositoryError}</p>}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button type="button" onClick={onNextStep} disabled={!isStepValid()}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default DeploymentWizardStep1;
