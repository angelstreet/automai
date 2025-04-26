'use client';

import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { updateJob } from '@/app/actions/jobsAction';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { useToast } from '@/components/shadcn/use-toast';
import { Deployment } from '@/types/component/deploymentComponentType';

interface EditDeploymentDialogClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployment: Deployment | null;
}

interface FormValues {
  name: string;
  config: string;
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
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Get the config as a formatted JSON string for editing
  const getFormattedConfig = (deployment: Deployment | null) => {
    if (!deployment || !deployment.config) return '{}';
    try {
      return JSON.stringify(deployment.config, null, 2);
    } catch (error) {
      console.error('[@component:EditDeploymentDialogClient] Error formatting config:', error);
      return '{}';
    }
  };

  const form = useForm<FormValues>({
    defaultValues: {
      name: deployment?.name || '',
      config: getFormattedConfig(deployment),
    },
  });

  // Reset form when deployment changes
  useEffect(() => {
    if (deployment) {
      form.reset({
        name: deployment.name || '',
        config: getFormattedConfig(deployment),
      });
      setJsonError(null);
    }
  }, [deployment, form]);

  // Fetch and preload the configuration data when the dialog opens
  useEffect(() => {
    if (open && deployment?.id) {
      console.log(
        `[@component:EditDeploymentDialogClient] Loading configuration for deployment: ${deployment.id}`,
      );

      // If the config is not already loaded, we could fetch it specifically here
      if (!deployment.config) {
        // We could implement a specific fetch here if needed
        console.log(
          '[@component:EditDeploymentDialogClient] No config data available, could fetch it separately',
        );
      }
    }
  }, [open, deployment]);

  // Validate JSON as user types
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'config') {
        try {
          if (value.config && value.config.trim() !== '') {
            JSON.parse(value.config as string);
            setJsonError(null);
          }
        } catch (error: any) {
          setJsonError(error.message);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

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

    // Parse config from string to object
    let configObject;
    try {
      configObject = JSON.parse(data.config);
    } catch (error: any) {
      console.error('[@component:EditDeploymentDialogClient] Invalid JSON config:', error);
      setJsonError(error.message);
      toast({
        title: c('error'),
        description: `Invalid JSON configuration: ${error.message}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`[@component:EditDeploymentDialogClient] Updating deployment: ${deployment.id}`);

      const result = await updateJob(deployment.id, {
        name: data.name,
        config: configObject,
      });

      if (result.success) {
        console.log(`[@component:EditDeploymentDialogClient] Update successful`);
        toast({
          title: c('success'),
          description: t('update_success'),
        });
        onOpenChange(false);
      } else {
        console.error(`[@component:EditDeploymentDialogClient] Update failed: ${result.error}`);
        toast({
          title: c('error'),
          description: result.error || t('update_error'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('[@component:EditDeploymentDialogClient] Error updating deployment:', error);
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
          <DialogTitle>{t('edit_deployment')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c('name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c('config')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className={`font-mono text-sm h-[300px] ${jsonError ? 'border-red-500' : ''}`}
                      spellCheck="false"
                    />
                  </FormControl>
                  {jsonError && (
                    <FormMessage className="text-red-500 text-xs">{jsonError}</FormMessage>
                  )}
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {c('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || !!jsonError}>
                {isSubmitting ? c('updating') : c('update')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
