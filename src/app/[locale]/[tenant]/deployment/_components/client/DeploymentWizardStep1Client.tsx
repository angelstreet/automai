'use client';

import React from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { Repository } from '@/types/component/repositoryComponentType';

interface DeploymentWizardStep1ClientProps {
  name: string;
  description: string;
  repositoryId: string;
  branch: string;
  repositories: Repository[];
  repositoryError: string | null;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onNextStep: () => void;
  isStepValid: boolean | (() => boolean);
}

const DeploymentWizardStep1Client: React.FC<DeploymentWizardStep1ClientProps> = ({
  name,
  description,
  repositoryId,
  branch,
  repositories,
  repositoryError,
  onInputChange,
  onNextStep,
  isStepValid,
}) => {
  // Check if step is valid - handle both function and boolean values
  const isValid = typeof isStepValid === 'function' ? isStepValid() : isStepValid;

  return (
    <div className="p-3 rounded-md border border-gray-200 dark:border-gray-700">
      <div className="space-y-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-0.5">
            Deployment Name
          </label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={onInputChange}
            placeholder="Enter deployment name"
            required
            className="bg-background"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-0.5">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={onInputChange}
            placeholder="Briefly describe this deployment"
            rows={2}
            className="resize-none min-h-[64px] max-h-[64px]"
          />
        </div>

        <div>
          <label htmlFor="repositoryId" className="block text-sm font-medium mb-0.5">
            Repository
          </label>
          <select
            id="repositoryId"
            name="repositoryId"
            value={repositoryId}
            onChange={onInputChange}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          >
            <option value="">Select repository</option>
            {repositories && repositories.length > 0 ? (
              repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name} ({repo.url ? new URL(repo.url).hostname : 'Unknown'})
                </option>
              ))
            ) : (
              <option value="" disabled>
                No repositories available
              </option>
            )}
          </select>
          {repositoryError && (
            <p className="text-sm text-red-500 mt-0.5">Error: {repositoryError}</p>
          )}
        </div>

        <div>
          <label htmlFor="branch" className="block text-sm font-medium mb-0.5">
            Branch
          </label>
          <div className="relative">
            <Input
              id="branch"
              name="branch"
              value={branch}
              onChange={onInputChange}
              placeholder="Select a repository first"
              className={`w-full ${repositoryId ? 'pr-[120px]' : ''} bg-background`}
              disabled={!repositoryId}
            />
            {repositoryId && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent">
                <span className="text-xs text-muted-foreground px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                  Default branch
                </span>
              </div>
            )}
          </div>
          {!repositoryId ? (
            <p className="text-xs text-muted-foreground mt-1">
              Select a repository to use its default branch
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Using default branch from the selected repository
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={onNextStep}
          disabled={!isValid}
          variant="default"
          className="bg-background dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default DeploymentWizardStep1Client;
export { DeploymentWizardStep1Client };
