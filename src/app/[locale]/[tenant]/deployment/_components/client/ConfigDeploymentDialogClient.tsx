import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { updateJob } from '@/app/actions/jobsAction';
import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getTeamMembers } from '@/app/actions/teamMemberAction';
import { getUser } from '@/app/actions/userAction';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { useToast } from '@/components/shadcn/use-toast';
import { Deployment } from '@/types/component/deploymentComponentType';

interface ConfigDeploymentDialogClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployment: Deployment | null;
}

export function ConfigDeploymentDialogClient({
  open,
  onOpenChange,
  deployment,
}: ConfigDeploymentDialogClientProps) {
  const t = useTranslations('deployment');
  const c = useTranslations('common');
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if the current user is an admin
  useEffect(() => {
    if (!open) return;

    const checkIfAdmin = async () => {
      setIsLoading(true);
      try {
        // Get the current user
        const user = await getUser();
        if (!user || !user.id) {
          console.log('[@component:ConfigDeploymentDialogClient] No user found');
          setIsAdmin(false);
          return;
        }

        // Get the user's active team
        const activeTeam = await getUserActiveTeam(user.id);
        if (!activeTeam || !activeTeam.id) {
          console.log('[@component:ConfigDeploymentDialogClient] No active team found');
          setIsAdmin(false);
          return;
        }

        // Get all members of the team
        const result = await getTeamMembers(activeTeam.id);
        if (!result.success || !result.data) {
          console.log('[@component:ConfigDeploymentDialogClient] Failed to get team members');
          setIsAdmin(false);
          return;
        }

        // Find the current user in the team members list
        const currentMember = result.data.find((member) => member.profile_id === user.id);
        if (!currentMember) {
          console.log('[@component:ConfigDeploymentDialogClient] User not found in team members');
          setIsAdmin(false);
          return;
        }

        // Check if the user is an admin
        const userIsAdmin = currentMember.role && currentMember.role.toLowerCase() === 'admin';
        console.log('[@component:ConfigDeploymentDialogClient] User is admin:', userIsAdmin);
        setIsAdmin(userIsAdmin === true);
      } catch (error) {
        console.error(
          '[@component:ConfigDeploymentDialogClient] Error checking admin status:',
          error,
        );
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkIfAdmin();
  }, [open]);

  // Get the config as a formatted JSON string for display
  const getFormattedConfig = (deployment: Deployment | null) => {
    if (!deployment || !deployment.config) return '{}';
    try {
      return JSON.stringify(deployment.config, null, 2);
    } catch (error) {
      console.error('[@component:ConfigDeploymentDialogClient] Error formatting config:', error);
      return '{}';
    }
  };

  const [formattedConfig, setFormattedConfig] = useState(getFormattedConfig(deployment));
  const [jobName, setJobName] = useState(deployment?.name || '');

  // Update formatted config and job name when deployment changes
  useEffect(() => {
    if (deployment) {
      setFormattedConfig(getFormattedConfig(deployment));
      setJobName(deployment.name);
    }
  }, [deployment]);

  const handleSave = async () => {
    if (!deployment) return;
    try {
      let configToSave;
      try {
        configToSave = JSON.parse(formattedConfig);
      } catch {
        toast({
          title: 'Invalid JSON',
          description: 'The configuration JSON is invalid. Please check the syntax.',
          variant: 'destructive',
        });
        return;
      }

      const result = await updateJob(deployment.id, {
        name: jobName,
        config: configToSave,
      });

      if (result.success) {
        toast({
          title: 'Configuration Updated',
          description: 'The job configuration has been successfully updated.',
        });
        onOpenChange(false);
      } else {
        toast({
          title: 'Update Failed',
          description: result.error || 'Failed to update the job configuration.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('[@component:ConfigDeploymentDialogClient] Error saving config:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while saving the configuration.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>
            {t('view_config')} : {deployment?.name || 'N/A'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-2">Checking permissions...</div>
          ) : (
            <>
              {isAdmin && (
                <div>
                  <label
                    htmlFor="jobName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('job_name')}
                  </label>
                  <Input
                    id="jobName"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}
              <div>
                <Textarea
                  value={formattedConfig}
                  onChange={(e) => setFormattedConfig(e.target.value)}
                  readOnly={!isAdmin}
                  className="font-mono text-sm h-[480px] bg-gray-50 dark:bg-gray-900 resize-none"
                  spellCheck="false"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {c('close')}
                </Button>
                {isAdmin && (
                  <Button type="button" variant="default" onClick={handleSave} className="ml-2">
                    {c('save')}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
