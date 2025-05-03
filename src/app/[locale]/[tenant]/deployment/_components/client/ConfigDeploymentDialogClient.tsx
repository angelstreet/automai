'use client';

import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { updateJob } from '@/app/actions/jobsAction';
import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getTeamMemberRole } from '@/app/actions/teamMemberAction';
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

  // Check if the current user is an admin
  useEffect(() => {
    if (!open) return;

    const checkIfAdmin = async () => {
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

        // Get the user's role using the server action
        const roleResult = await getTeamMemberRole(user.id, activeTeam.id);
        if (!roleResult) {
          console.log('[@component:ConfigDeploymentDialogClient] Failed to get user role');
          setIsAdmin(false);
          return;
        }

        // Check if the user is an admin
        const userIsAdmin = roleResult.toLowerCase() === 'admin';
        console.log('[@component:ConfigDeploymentDialogClient] User is admin:', userIsAdmin);
        setIsAdmin(userIsAdmin === true);
      } catch (error) {
        console.error(
          '[@component:ConfigDeploymentDialogClient] Error checking admin status:',
          error,
        );
        setIsAdmin(false);
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

  // Validate JSON with detailed error handling
  const validateJSON = (jsonString: string) => {
    try {
      JSON.parse(jsonString);
      return { valid: true, error: null };
    } catch (error: any) {
      // Extract line and position information from the error message
      // Example: "SyntaxError: Unexpected token } in JSON at position 50"
      const errorMessage = error.message || '';
      let lineInfo = '';

      // Try to find the line and position where the error occurred
      if (jsonString) {
        const position = errorMessage.match(/position (\d+)/)?.[1];
        if (position) {
          const pos = parseInt(position);
          // Count lines up to the error position
          const upToError = jsonString.substring(0, pos);
          const lineNumber = upToError.split('\n').length;

          // Get the problematic line
          const lines = jsonString.split('\n');
          const errorLine = lines[lineNumber - 1] || '';

          lineInfo = `Line ${lineNumber}: ${errorLine.trim()}`;
        }
      }

      return {
        valid: false,
        error: errorMessage,
        lineInfo,
      };
    }
  };

  const handleSave = async () => {
    if (!deployment) return;
    try {
      // Validate the JSON
      const validation = validateJSON(formattedConfig);
      if (!validation.valid) {
        toast({
          title: 'Invalid JSON',
          description: `${validation.error}. ${validation.lineInfo}`,
          variant: 'destructive',
        });
        return;
      }

      // If JSON is valid, parse it
      const configToSave = JSON.parse(formattedConfig);

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
          <div>
            <Input
              id="jobName"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="w-full"
              disabled={!isAdmin}
              readOnly={!isAdmin}
            />
          </div>
          <div>
            <Textarea
              id="jobConfig"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
