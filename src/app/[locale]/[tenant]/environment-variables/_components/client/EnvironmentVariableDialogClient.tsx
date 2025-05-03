'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  createEnvironmentVariable,
  updateEnvironmentVariable,
} from '@/app/actions/environmentVariablesAction';
import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Switch } from '@/components/shadcn/switch';
import { Textarea } from '@/components/shadcn/textarea';
import { toast } from '@/components/shadcn/use-toast';
import {
  EnvironmentVariable,
  EnvironmentVariableCreateInput,
  EnvironmentVariableUpdateInput,
} from '@/types/context/environmentVariablesContextType';

interface EnvironmentVariableDialogClientProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  variable?: EnvironmentVariable;
  onVariableCreated?: (variable: EnvironmentVariable) => void;
  onVariableUpdated?: (variable: EnvironmentVariable) => void;
}

// Form validation schema
const formSchema = z.object({
  key: z
    .string()
    .min(1, { message: 'Key is required' })
    .regex(/^[A-Za-z0-9_]+$/, {
      message: 'Key must only contain letters, numbers, and underscores',
    }),
  value: z.string().min(1, { message: 'Value is required' }),
  description: z.string().optional(),
  is_secret: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export function EnvironmentVariableDialogClient({
  isOpen,
  onOpenChange,
  teamId,
  variable,
  onVariableCreated,
  onVariableUpdated,
}: EnvironmentVariableDialogClientProps) {
  const t = useTranslations('environmentVariables');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!variable;

  // Setup react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: variable?.key || '',
      value: variable?.value || '',
      description: variable?.description || '',
      is_secret: variable?.is_secret || false,
    },
  });

  // Reset form when dialog opens/closes or variable changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        key: variable?.key || '',
        value: variable?.value || '',
        description: variable?.description || '',
        is_secret: variable?.is_secret || false,
      });
    }
  }, [isOpen, variable, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      if (isEditMode && variable) {
        // Update existing variable
        const updateData: EnvironmentVariableUpdateInput = {
          key: values.key !== variable.key ? values.key : undefined,
          value: values.value !== variable.value ? values.value : undefined,
          description: values.description !== variable.description ? values.description : undefined,
          is_secret: values.is_secret !== variable.is_secret ? values.is_secret : undefined,
        };

        const result = await updateEnvironmentVariable(variable.id, updateData);

        if (result.success && result.data) {
          toast({
            title: t('update_success'),
            description: `${values.key} ${t('updated_successfully')}`,
          });
          onVariableUpdated?.(result.data);
          onOpenChange(false);
        } else {
          toast({
            title: t('error_update'),
            description: result.error || t('unknown_error'),
            variant: 'destructive',
          });
        }
      } else {
        // Create new variable
        const createData: EnvironmentVariableCreateInput = {
          key: values.key,
          value: values.value,
          description: values.description,
          is_secret: values.is_secret,
        };

        const result = await createEnvironmentVariable(teamId, createData);

        if (result.success && result.data) {
          toast({
            title: t('create_success'),
            description: `${values.key} ${t('created_successfully')}`,
          });
          onVariableCreated?.(result.data);
          onOpenChange(false);
        } else {
          toast({
            title: t('error_create'),
            description: result.error || t('unknown_error'),
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: isEditMode ? t('error_update') : t('error_create'),
        description: error instanceof Error ? error.message : t('unknown_error'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('edit_title') : t('add_title')}</DialogTitle>
          {!isEditMode && <DialogDescription>{t('add_desc')}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key">{t('key')}</Label>
            <Input
              id="key"
              {...form.register('key')}
              placeholder="DATABASE_URL"
              disabled={isSubmitting}
            />
            {form.formState.errors.key && (
              <p className="text-sm text-destructive">{form.formState.errors.key.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">{t('value')}</Label>
            <Input
              id="value"
              {...form.register('value')}
              placeholder="postgres://user:password@host:port/db"
              disabled={isSubmitting}
            />
            {form.formState.errors.value && (
              <p className="text-sm text-destructive">{form.formState.errors.value.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder={t('description')}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_secret"
              {...form.register('is_secret')}
              checked={form.watch('is_secret')}
              onCheckedChange={(checked: boolean) => form.setValue('is_secret', checked)}
              disabled={isSubmitting}
            />
            <Label htmlFor="is_secret" className="cursor-pointer">
              {t('is_secret')}
            </Label>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('saving') : isEditMode ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
