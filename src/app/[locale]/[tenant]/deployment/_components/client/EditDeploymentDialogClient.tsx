'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

import { updateJob } from '@/app/actions/jobsAction';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Separator } from '@/components/shadcn/separator';
import { useToast } from '@/components/shadcn/use-toast';
import { Deployment } from '@/types/component/deploymentComponentType';

interface EditDeploymentDialogClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployment: Deployment | null;
}

interface FormValues {
  name: string;
  scripts: { path: string; parameters: string }[];
}

export function EditDeploymentDialogClient({
  open,
  onOpenChange,
  deployment,
}: EditDeploymentDialogClientProps) {
  const t = useTranslations('deployment');
  const c = useTranslations('common');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Extract scripts from config for editing
  const getScriptsFromConfig = (deployment: Deployment | null) => {
    if (!deployment || !deployment.config || !deployment.config.scripts) {
      return [];
    }
    try {
      return deployment.config.scripts.map((script: any) => ({
        path: script.path || '',
        parameters: script.parameters || '',
      }));
    } catch (error) {
      console.error('[@component:EditDeploymentDialogClient] Error extracting scripts:', error);
      return [];
    }
  };

  const form = useForm<FormValues>({
    defaultValues: {
      name: deployment?.name || '',
      scripts: getScriptsFromConfig(deployment),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'scripts',
  });

  // Reset form when deployment changes
  useEffect(() => {
    if (deployment) {
      form.reset({
        name: deployment.name || '',
        scripts: getScriptsFromConfig(deployment),
      });
    }
  }, [deployment, form]);

  // Fetch and preload the configuration data when the dialog opens
  useEffect(() => {
    if (open && deployment?.id) {
      console.log(
        `[@component:EditDeploymentDialogClient] Loading configuration for deployment: ${deployment.id}`,
      );

      if (!deployment.config) {
        console.log(
          '[@component:EditDeploymentDialogClient] No config data available, could fetch it separately',
        );
      }
    }
  }, [open, deployment]);

  const onSubmit = async (data: FormValues) => {
    if (!deployment?.id) {
      console.error(
        '[@component:EditDeploymentDialogClient] No deployment ID available for update',
      );
      toast({
        title: c('error'),
        description: 'Cannot update deployment: missing ID',
        variant: 'destructive',
      });
      return;
    }

    // Reconstruct the config object with updated scripts
    let configObject = deployment.config ? { ...deployment.config } : {};
    if (data.scripts.length > 0) {
      configObject.scripts = data.scripts.map((script) => ({
        path: script.path,
        parameters: script.parameters,
      }));
    }

    setIsSubmitting(true);
    try {
      console.log(
        `[@component:EditDeploymentDialogClient] Starting update for deployment: ${deployment?.id} at ${new Date().toISOString()}`,
      );
      const result = await updateJob(deployment.id, { name: data.name, config: configObject });
      if (result.success) {
        console.log(
          `[@component:EditDeploymentDialogClient] Update successful for deployment: ${deployment?.id} at ${new Date().toISOString()}`,
        );
        toast({
          title: c('success'),
          description: t('update_success'),
        });

        router.refresh(); // Force client-side refresh
        console.log(
          `[@component:EditDeploymentDialogClient] Router refresh attempted at ${new Date().toISOString()}`,
        );

        onOpenChange(false);
      } else {
        console.error(
          `[@component:EditDeploymentDialogClient] Update failed for deployment: ${deployment?.id} at ${new Date().toISOString()}: ${result.error}`,
        );
        toast({
          title: c('error'),
          description: result.error || t('update_error'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error(
        `[@component:EditDeploymentDialogClient] Error during update at ${new Date().toISOString()}: ${error.message}`,
      );
      toast({
        title: c('error'),
        description: error.message || t('update_error'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {t('edit_parameters')} : {deployment?.name || 'N/A'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 px-1 font-medium text-sm">
                  <div>{c('script_path')}</div>
                  <div>{c('parameters')}</div>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id}>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`scripts.${index}.path`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} disabled />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`scripts.${index}.parameters`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder={c('parameters')} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {index < fields.length - 1 && <Separator className="my-4" />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No scripts available to edit.</p>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {c('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? c('updating') : c('update')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
