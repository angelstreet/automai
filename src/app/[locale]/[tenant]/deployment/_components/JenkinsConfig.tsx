'use client';

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Server, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/shadcn/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover';
import { cn } from '@/lib/utils';

interface JenkinsConfigProps {
  enabled: boolean;
  config: {
    providerId?: string;
    jobId?: string;
    jenkinsUrl?: string;
    jobName?: string;
    credentials?: string;
    customParameters?: Record<string, string>;
    parameters?: Record<string, any>;
    jenkinsFile?: string;
  };
  onChange: (enabled: boolean, config: any) => void;
  className?: string;
  
  // Real data from hooks
  providers?: any[];
  jobs?: any[];
  jobParameters?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    default?: string;
    choices?: string[];
  }>;
  isLoadingProviders?: boolean;
  isLoadingJobs?: boolean;
  isLoadingJobDetails?: boolean;
  onProviderChange?: (providerId: string) => void;
  onJobChange?: (jobId: string) => void;
  onParameterChange?: (name: string, value: string) => void;
}

const JenkinsConfig: React.FC<JenkinsConfigProps> = ({
  enabled,
  config,
  onChange,
  className,
  providers = [],
  jobs = [],
  jobParameters = [],
  isLoadingProviders = false,
  isLoadingJobs = false,
  isLoadingJobDetails = false,
  onProviderChange,
  onJobChange,
  onParameterChange,
}) => {
  const [openProviders, setOpenProviders] = useState(false);
  const [openCredentials, setOpenCredentials] = useState(false);
  const [openJobs, setOpenJobs] = useState(false);
  
  // Custom parameters management
  const [customParams, setCustomParams] = useState<Array<{ key: string; value: string }>>(
    Object.entries(config.customParameters || {}).map(([key, value]) => ({ key, value }))
  );
  
  // Use real providers
  const providerOptions = providers.map(p => ({ value: p.id, label: p.name }));
  
  // Use real jobs
  const jobOptions = jobs.map(j => ({ value: j.id, label: j.name }));
  
  const handleEnableChange = (checked: boolean) => {
    onChange(checked, config);
  };
  
  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    onChange(enabled, newConfig);
  };
  
  const handleProviderSelect = (providerId: string) => {
    if (onProviderChange) {
      onProviderChange(providerId);
    } else {
      handleConfigChange('providerId', providerId);
    }
    setOpenProviders(false);
  };
  
  const handleJobSelect = (jobId: string) => {
    if (onJobChange) {
      onJobChange(jobId);
    } else {
      handleConfigChange('jobId', jobId);
    }
    setOpenJobs(false);
  };
  
  const handleParameterValueChange = (name: string, value: string) => {
    if (onParameterChange) {
      onParameterChange(name, value);
    } else {
      const newParameters = { ...(config.parameters || {}), [name]: value };
      handleConfigChange('parameters', newParameters);
    }
  };
  
  const addCustomParam = () => {
    setCustomParams([...customParams, { key: '', value: '' }]);
  };
  
  const removeCustomParam = (index: number) => {
    const newParams = [...customParams];
    newParams.splice(index, 1);
    setCustomParams(newParams);
    
    // Update the config object
    const paramObj = newParams.reduce((obj, { key, value }) => {
      if (key) obj[key] = value;
      return obj;
    }, {} as Record<string, string>);
    
    handleConfigChange('customParameters', paramObj);
  };
  
  const updateCustomParam = (index: number, key: string, value: string) => {
    const newParams = [...customParams];
    if (key === 'key') {
      newParams[index].key = value;
    } else {
      newParams[index].value = value;
    }
    setCustomParams(newParams);
    
    // Update the config object
    const paramObj = newParams.reduce((obj, { key, value }) => {
      if (key) obj[key] = value;
      return obj;
    }, {} as Record<string, string>);
    
    handleConfigChange('customParameters', paramObj);
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-gray-500" />
          <h3 className="text-base font-medium">CI/CD Integration</h3>
        </div>
      </div>
      
      {enabled && (
        <div className="border rounded-md p-4">
          <div className="space-y-4">
            {/* Jenkins Provider Selection */}
            <div className="space-y-2">
              <Label>Jenkins Provider</Label>
              {isLoadingProviders ? (
                <div className="h-9 flex items-center justify-center border rounded-md bg-gray-50 dark:bg-gray-800">
                  <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <Popover open={openProviders} onOpenChange={setOpenProviders}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openProviders}
                      className="w-full justify-between"
                    >
                      {config.providerId ? 
                        providerOptions.find((option) => option.value === config.providerId)?.label : 
                        "Select Jenkins provider..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search providers..." />
                      <CommandEmpty>No providers found.</CommandEmpty>
                      <CommandGroup>
                        {providerOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            onSelect={() => handleProviderSelect(option.value)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                config.providerId === option.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              {providers.length === 0 && !isLoadingProviders && (
                <p className="text-xs text-amber-500">
                  No Jenkins providers found. Please configure a Jenkins provider in the CI/CD settings.
                </p>
              )}
            </div>
            
            {/* Jenkins URL (read-only, comes from selected provider) */}
            <div className="space-y-2">
              <Label htmlFor="jenkins-url">Jenkins URL</Label>
              <Input
                id="jenkins-url"
                placeholder="https://jenkins.example.com"
                value={config.jenkinsUrl || ''}
                readOnly={!!config.providerId}
                disabled={!!config.providerId}
                onChange={(e) => handleConfigChange('jenkinsUrl', e.target.value)}
                className={cn(config.providerId && "bg-gray-50 dark:bg-gray-800")}
              />
              {config.providerId && (
                <p className="text-xs text-gray-500">
                  URL is automatically set from the selected provider.
                </p>
              )}
            </div>
            
            {/* Jenkins Job Selection */}
            <div className="space-y-2">
              <Label>Jenkins Job</Label>
              {!config.providerId ? (
                <p className="text-xs text-amber-500 mb-2">
                  Please select a Jenkins provider first.
                </p>
              ) : isLoadingJobs ? (
                <div className="h-9 flex items-center justify-center border rounded-md bg-gray-50 dark:bg-gray-800">
                  <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <Popover open={openJobs} onOpenChange={setOpenJobs}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openJobs}
                      className="w-full justify-between"
                      disabled={!config.providerId || isLoadingJobs}
                    >
                      {config.jobId ? 
                        jobOptions.find((option) => option.value === config.jobId)?.label : 
                        "Select job..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search jobs..." />
                      <CommandEmpty>No jobs found.</CommandEmpty>
                      <CommandGroup>
                        {jobOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            onSelect={() => handleJobSelect(option.value)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                config.jobId === option.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              {jobs.length === 0 && config.providerId && !isLoadingJobs && (
                <p className="text-xs text-amber-500">
                  No jobs found in this Jenkins provider. Please make sure jobs are configured.
                </p>
              )}
            </div>
            
            {/* Job Parameters */}
            {config.jobId && jobParameters && jobParameters.length > 0 && (
              <div className="space-y-2 border rounded-md p-3 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium text-sm">Job Parameters</h4>
                {isLoadingJobDetails ? (
                  <div className="h-9 flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {jobParameters.map((param) => (
                      <div key={param.name} className="space-y-1">
                        <Label htmlFor={`param-${param.name}`} className="flex items-center gap-1">
                          {param.name}
                          {param.required && <span className="text-red-500">*</span>}
                        </Label>
                        {param.choices ? (
                          <select 
                            id={`param-${param.name}`}
                            value={(config.parameters && config.parameters[param.name]) || param.default || ''}
                            onChange={(e) => handleParameterValueChange(param.name, e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm bg-white dark:bg-gray-800"
                          >
                            {param.choices.map((choice: string) => (
                              <option key={choice} value={choice}>{choice}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={`param-${param.name}`}
                            placeholder={param.description || `Enter ${param.name}...`}
                            value={(config.parameters && config.parameters[param.name]) || param.default || ''}
                            onChange={(e) => handleParameterValueChange(param.name, e.target.value)}
                          />
                        )}
                        {param.description && (
                          <p className="text-xs text-gray-500">{param.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Custom Parameters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Additional Parameters</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addCustomParam}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Parameter
                </Button>
              </div>
              
              <div className="space-y-2">
                {customParams.map((param, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Name"
                      value={param.key}
                      onChange={(e) => updateCustomParam(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={param.value}
                      onChange={(e) => updateCustomParam(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeCustomParam(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Jenkinsfile Override */}
            <div className="space-y-2">
              <Label htmlFor="jenkins-file">Custom Jenkinsfile (Optional)</Label>
              <Textarea
                id="jenkins-file"
                placeholder="pipeline { ... }"
                className="font-mono text-xs h-32"
                value={config.jenkinsFile || ''}
                onChange={(e) => handleConfigChange('jenkinsFile', e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Expert users can provide a custom Jenkinsfile that will override the default pipeline configuration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JenkinsConfig;
