'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { updateJob } from '@/app/actions/jobsAction';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/shadcn/form';
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
  description: string;
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

  const form = useForm<FormValues>({
    defaultValues: {
      name: deployment?.name || '',
      description: deployment?.description || '',
    },
  });

  // Reset form when deployment changes
  React.useEffect(() => {
    if (deployment) {
      form.reset({
        name: deployment.name || '',
        description: deployment.description || '',
      });
    }
  }, [deployment, form]);

  const onSubmit = async (data: FormValues) => {
    if (!deployment?.id) {
      console.error(
        '[@component:EditDeploymentDialogClient] No deployment ID available for update',
      );
      toast({
        title: 'Error',
        description: 'Cannot update deployment: missing ID',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`[@component:EditDeploymentDialogClient] Updating deployment: ${deployment.id}`);

      const result = await updateJob(deployment.id, {
        name: data.name,
        description: data.description,
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
      <DialogContent className="sm:max-w-[500px]">
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
                  <FormLabel>{t('name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
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
