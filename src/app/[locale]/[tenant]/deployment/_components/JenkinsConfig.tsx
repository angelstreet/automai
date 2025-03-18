'use client';

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Server, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/shadcn/collapsible';
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
import CustomSwitch from './CustomSwitch';

interface JenkinsConfigProps {
  enabled: boolean;
  config: {
    jenkinsUrl?: string;
    jobName?: string;
    credentials?: string;
    customParameters?: Record<string, string>;
  };
  onChange: (enabled: boolean, config: any) => void;
  className?: string;
}

import { JENKINS_CREDENTIAL_OPTIONS, JENKINS_JOB_OPTIONS } from '../constants';

// Use imported constants
const credentialOptions = JENKINS_CREDENTIAL_OPTIONS;
const jobOptions = JENKINS_JOB_OPTIONS;

const JenkinsConfig: React.FC<JenkinsConfigProps> = ({
  enabled,
  config,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openCredentials, setOpenCredentials] = useState(false);
  const [openJobs, setOpenJobs] = useState(false);
  
  // Custom parameters management
  const [customParams, setCustomParams] = useState<Array<{ key: string; value: string }>>(
    Object.entries(config.customParameters || {}).map(([key, value]) => ({ key, value }))
  );
  
  const handleEnableChange = (checked: boolean) => {
    onChange(checked, config);
  };
  
  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    onChange(enabled, newConfig);
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
          <h3 className="text-base font-medium">Jenkins Integration</h3>
        </div>
        <CustomSwitch 
          checked={enabled} 
          onCheckedChange={handleEnableChange}
        />
      </div>
      
      {enabled && (
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="border rounded-md p-2"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Configure Jenkins Pipeline</h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronsUpDown className="h-4 w-4" />
                ) : (
                  <ChevronsUpDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="mt-2 space-y-4">
            {/* Jenkins URL */}
            <div className="space-y-2">
              <Label htmlFor="jenkins-url">Jenkins URL</Label>
              <Input
                id="jenkins-url"
                placeholder="https://jenkins.example.com"
                value={config.jenkinsUrl || ''}
                onChange={(e) => handleConfigChange('jenkinsUrl', e.target.value)}
              />
            </div>
            
            {/* Jenkins Credentials */}
            <div className="space-y-2">
              <Label>Credentials</Label>
              <Popover open={openCredentials} onOpenChange={setOpenCredentials}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCredentials}
                    className="w-full justify-between"
                  >
                    {config.credentials ? 
                      credentialOptions.find((option) => option.value === config.credentials)?.label : 
                      "Select credentials..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search credentials..." />
                    <CommandEmpty>No credentials found.</CommandEmpty>
                    <CommandGroup>
                      {credentialOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          onSelect={() => {
                            handleConfigChange('credentials', option.value);
                            setOpenCredentials(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              config.credentials === option.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Jenkins Job */}
            <div className="space-y-2">
              <Label>Jenkins Job</Label>
              <Popover open={openJobs} onOpenChange={setOpenJobs}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openJobs}
                    className="w-full justify-between"
                  >
                    {config.jobName ? 
                      jobOptions.find((option) => option.value === config.jobName)?.label : 
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
                          onSelect={() => {
                            handleConfigChange('jobName', option.value);
                            setOpenJobs(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              config.jobName === option.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Custom Parameters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Parameters</Label>
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
                onChange={(e) => handleConfigChange('jenkinsFile', e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Expert users can provide a custom Jenkinsfile that will override the default pipeline configuration.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default JenkinsConfig;