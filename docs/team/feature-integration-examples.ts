// src/app/[locale]/[tenant]/hosts/_components/HostList.tsx
// Example of integrating team feature with the hosts page
'use client';

import { useState, useEffect } from 'react';
import { useTeam } from '@/context';
import { useHosts } from '@/context';
import { useResourceLimit } from '@/hooks/useResourceLimit';
import { Button } from '@/components/shadcn/button';
import { PlusIcon } from 'lucide-react';
import { ConnectHostDialog } from './ConnectHostDialog';
import { HostGrid } from './HostGrid';
import { HostTable } from './HostTable';

export function HostList() {
  const { hosts, loading, error, fetchHosts } = useHosts();
  const { selectedTeam } = useTeam();
  const { checkAndNotify } = useResourceLimit();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showDialog, setShowDialog] = useState(false);

  // Re-fetch hosts when selected team changes
  useEffect(() => {
    if (selectedTeam) {
      fetchHosts(selectedTeam.id);
    }
  }, [selectedTeam, fetchHosts]);

  const handleAddHost = async () => {
    // Check resource limit before opening the dialog
    const canCreate = await checkAndNotify('hosts');
    if (canCreate) {
      setShowDialog(true);
    }
  };

  if (loading) {
    return <div>Loading hosts...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Hosts</h2>
          <p className="text-muted-foreground">
            {selectedTeam ? `Team: ${selectedTeam.name}` : 'Manage your hosts'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* View toggle buttons */}
          <Button onClick={handleAddHost}>
            <PlusIcon className="mr-2 h-4 w-4" /> Add Host
          </Button>
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <HostGrid hosts={hosts} />
      ) : (
        <HostTable hosts={hosts} />
      )}
      
      {showDialog && (
        <ConnectHostDialog 
          open={showDialog} 
          onOpenChange={setShowDialog} 
          teamId={selectedTeam?.id}
        />
      )}
    </div>
  );
}

// src/app/[locale]/[tenant]/deployment/_components/DeploymentWizard.tsx
// Example of integrating team feature with the deployment wizard
'use client';

import { useState } from 'react';
import { useTeam } from '@/context';
import { useResourceLimit } from '@/hooks/useResourceLimit';
import { Button } from '@/components/shadcn/button';
import { useToast } from '@/components/shadcn/use-toast';
import { DeploymentWizardStep1 } from './DeploymentWizardStep1';
// ... other imports

interface DeploymentWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function DeploymentWizard({ onComplete, onCancel }: DeploymentWizardProps) {
  const { selectedTeam } = useTeam();
  const { checkAndNotify } = useResourceLimit();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    repositoryId: '',
    // ... other fields
  });

  // Check resource limit before starting
  const handleCreate = async () => {
    if (!selectedTeam) {
      toast({
        title: 'Team Required',
        description: 'Please select a team before creating a deployment',
        variant: 'destructive'
      });
      return;
    }
    
    const canCreate = await checkAndNotify('deployments');
    if (!canCreate) {
      return;
    }
    
    // Create the deployment with team_id
    try {
      // API call to create deployment
      // Include selectedTeam.id in the request
      onComplete();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create deployment',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Create New Deployment</h2>
        {selectedTeam && (
          <div className="bg-primary/10 px-3 py-1 rounded-full text-sm">
            Team: {selectedTeam.name}
          </div>
        )}
      </div>
      
      {/* Wizard steps */}
      {step === 1 && (
        <DeploymentWizardStep1 
          data={formData}
          onChange={(data) => setFormData({...formData, ...data})}
          onNext={() => setStep(2)}
          onCancel={onCancel}
        />
      )}
      
      {/* Additional steps... */}
      
      {step === 5 && (
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
          <Button onClick={handleCreate}>Create Deployment</Button>
        </div>
      )}
    </div>
  );
}

// src/app/[locale]/[tenant]/repositories/actions.ts
// Example of integrating team feature with repository server actions
'use server';

import { cookies } from 'next/headers';
import { getUser } from '@/app/actions/user';
import { createRepository as dbCreateRepository } from '@/lib/supabase/db-repositories';
import { checkResourceLimit } from '@/lib/supabase/db-teams';
import type { ActionResult } from '@/lib/types';
import type { RepositoryCreateInput, Repository } from '@/types/context/repository';

export async function createRepository(
  input: RepositoryCreateInput & { teamId: string }
): Promise<ActionResult<Repository>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Check resource limits
    const cookieStore = cookies();
    const limitResult = await checkResourceLimit(user.tenant_id, 'repositories', cookieStore);
    
    if (!limitResult.success) {
      return { success: false, error: limitResult.error };
    }
    
    if (!limitResult.data.canCreate) {
      return { 
        success: false, 
        error: `Repository limit reached (${limitResult.data.current}/${limitResult.data.limit}). Please upgrade your subscription.`
      };
    }
    
    // Create repository with team_id
    const { teamId, ...repoData } = input;
    const result = await dbCreateRepository(
      {
        ...repoData,
        tenant_id: user.tenant_id
      },
      teamId,
      cookieStore
    );
    
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create repository' };
  }
}

// src/app/[locale]/[tenant]/cicd/_components/CICDProviderForm.tsx
// Example of integrating team feature with CICD provider form
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTeam } from '@/context';
import { useResourceLimit } from '@/hooks/useResourceLimit';
import { Button } from '@/components/shadcn/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { useToast } from '@/components/shadcn/use-toast';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  url: z.string().url('Valid URL is required'),
  // ... other fields
});

type FormValues = z.infer<typeof formSchema>;

interface CICDProviderFormProps {
  onSubmit: (data: FormValues & { teamId?: string }) => Promise<void>;
  onCancel: () => void;
}

export function CICDProviderForm({ onSubmit, onCancel }: CICDProviderFormProps) {
  const { selectedTeam } = useTeam();
  const { checkAndNotify } = useResourceLimit();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'jenkins',
      url: '',
      // ... other defaults
    }
  });
  
  const handleSubmit = async (values: FormValues) => {
    if (!selectedTeam) {
      toast({
        title: 'Team Required',
        description: 'Please select a team before creating a CI/CD provider',
        variant: 'destructive'
      });
      return;
    }
    
    const canCreate = await checkAndNotify('cicd_providers');
    if (!canCreate) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Include team ID in the submission
      await onSubmit({
        ...values,
        teamId: selectedTeam.id
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create CI/CD provider',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">New CI/CD Provider</h2>
          {selectedTeam && (
            <div className="bg-primary/10 px-3 py-1 rounded-full text-sm">
              Team: {selectedTeam.name}
            </div>
          )}
        </div>
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provider Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Other form fields... */}
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Provider'}
          </Button>
        </div>
      </form>
    </Form>
  );
}