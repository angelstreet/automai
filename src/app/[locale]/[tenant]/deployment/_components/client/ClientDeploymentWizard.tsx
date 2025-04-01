'use client';

import { ArrowLeft } from 'lucide-react';
import React, { useState, useTransition } from 'react';

import { toast } from '@/components/shadcn/use-toast';
import { useUser, useDeploymentWizard } from '@/context';
import {  CICDProviderType  } from '@/types/context/cicdContextType';
import {  DeploymentData, DeploymentFormData  } from '@/types/component/deploymentComponentType';
import {  Host as HostType, Host as SystemHost  } from '@/types/component/hostComponentType';

import DeploymentWizardStep1 from '../DeploymentWizardStep1';
import DeploymentWizardStep2 from '../DeploymentWizardStep2';
import DeploymentWizardStep3 from '../DeploymentWizardStep3';
import DeploymentWizardStep4 from '../DeploymentWizardStep4';

import DeploymentWizardStep5 from './DeploymentWizardStep5';

import { Repository as RepositoryInterface } from '@types/context/repository';

// Helper function to adapt system hosts to the format expected by the deployment module
const adaptHostsForDeployment = (systemHosts: SystemHost[]): HostType[] => {
  return systemHosts.map((host) => ({
    id: host.id,
    name: host.name,
    environment: host.is_windows ? 'Windows' : 'Linux', // Use OS type as environment
    status: host.status === 'connected' ? 'online' : 'offline',
    ip: host.ip,
  }));
};

// Initial deployment data object
const initialDeploymentData: DeploymentData = {
  name: '',
  description: '',
  repositoryId: '',
  branch: 'main',
  targetHostId: null,
  scriptPath: null,
  autoStart: false,
  cicdProviderId: null,
  configuration: {},
  scheduled: false,
};

interface ClientDeploymentWizardProps {
  initialRepositories: RepositoryInterface[];
  initialHosts: SystemHost[];
  initialCICDProviders: CICDProviderType[];
  onCancel: () => void;
  onDeploymentCreated?: () => void;
}

export default function ClientDeploymentWizard({
  initialRepositories,
  initialHosts,
  initialCICDProviders,
  onCancel,
  onDeploymentCreated,
}: ClientDeploymentWizardProps) {
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [deploymentData, setDeploymentData] = useState<DeploymentData>(initialDeploymentData);

  // Adapter hosts for deployment format
  const adaptedHosts = adaptHostsForDeployment(initialHosts);

  // Handler for updating deployment data
  const handleUpdateData = (data: Partial<DeploymentData>) => {
    setDeploymentData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  // Navigation handlers
  const handleNext = () => setStep((s) => Math.min(s + 1, 5));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  // Cancel handler
  const handleCancel = () => {
    onCancel();
  };

  // Get the deployment wizard hooks
  const { saveDeploymentConfiguration, startDeployment } = useDeploymentWizard();

  // Final submit handler
  const handleSubmit = () => {
    // Convert deployment data to form data
    const formData: DeploymentFormData = {
      name: deploymentData.name,
      description: deploymentData.description,
      repositoryId: deploymentData.repositoryId,
      branch: deploymentData.branch,
      targetHostId: deploymentData.targetHostId,
      scriptPath: deploymentData.scriptPath,
      cicdProviderId: deploymentData.cicdProviderId,
      configuration: deploymentData.configuration,
      scheduled: deploymentData.scheduled,
      schedule: deploymentData.schedule,
    };

    // Start transition to prevent UI freezing during the operation
    startTransition(async () => {
      try {
        // Save deployment configuration using the hook
        const result = await saveDeploymentConfiguration(formData);

        if (result.success && result.data) {
          // If auto-start is enabled, start the deployment using the hook
          if (deploymentData.autoStart) {
            await startDeployment(result.data.id);
          }

          // Show success message
          toast({
            title: 'Deployment created successfully',
            description: `Your deployment "${deploymentData.name}" has been created.`,
          });

          // Notify parent component
          onDeploymentCreated?.();
        } else {
          // Show error message
          toast({
            title: 'Failed to create deployment',
            description: result.error || 'An unknown error occurred',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        // Show error message for unexpected errors
        toast({
          title: 'Error',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    });
  };

  // Render wizard content based on current step
  const renderStepContent = () => {
    const commonProps = {
      data: deploymentData,
      onUpdateData: handleUpdateData,
      onNext: handleNext,
      onBack: handleBack,
      onCancel: handleCancel,
      onSubmit: handleSubmit,
      isPending,
    };

    switch (step) {
      case 1:
        return <DeploymentWizardStep1 {...commonProps} repositories={initialRepositories} />;
      case 2:
        return <DeploymentWizardStep2 {...commonProps} hosts={adaptedHosts} />;
      case 3:
        return (
          <DeploymentWizardStep3 {...commonProps} repositoryId={deploymentData.repositoryId} />
        );
      case 4:
        return <DeploymentWizardStep4 {...commonProps} />;
      case 5:
        return <DeploymentWizardStep5 {...commonProps} cicdProviders={initialCICDProviders} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="mr-2 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {step === 1 && 'Create Deployment'}
          {step === 2 && 'Select Target Host'}
          {step === 3 && 'Choose Deployment Script'}
          {step === 4 && 'Configure Deployment'}
          {step === 5 && 'CI/CD Integration'}
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">Step {step} of 5</div>
      </div>

      <div className="mb-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${(step / 5) * 100}%` }}
        ></div>
      </div>

      {renderStepContent()}
    </div>
  );
}
