import { useTranslations } from 'next-intl';
import { useState, useCallback, useRef } from 'react';
import * as React from 'react';
import { toast } from 'sonner';

import { createHost } from '@/app/actions/hosts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shadcn/dialog';

import { Host } from '../types';

import { ClientConnectionForm, FormData } from './client/ClientConnectionForm';

interface ConnectHostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (host: Host) => void;
}

export function ConnectHostDialog({ open, onOpenChange, onSuccess }: ConnectHostDialogProps) {
  const t = useTranslations('Common');
  const [isCreating, setIsCreating] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [_testError, setTestError] = useState<string | null>(null);
  const lastRequestTime = useRef<number>(0);
  const REQUEST_THROTTLE_MS = 500;
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      type: 'ssh',
      ip: '',
      port: '22',
      username: '',
      password: '',
    });
    setTestStatus('idle');
    setTestError(null);
  }, []);

  const validateFormData = (): boolean => {
    if (!formData.name.trim()) {
      toast.error(t('errors.nameRequired'));
      return false;
    }

    if (!formData.ip.trim()) {
      toast.error(t('errors.ipRequired'));
      return false;
    }

    const port = parseInt(formData.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      toast.error(t('errors.invalidPort'));
      return false;
    }

    if (formData.type === 'ssh' && (!formData.username.trim() || !formData.password.trim())) {
      toast.error(t('errors.sshCredentials'));
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateFormData()) {
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS) {
      return;
    }
    lastRequestTime.current = now;

    setIsCreating(true);

    try {
      // Map the form data to match the Host type expected by the createHost action
      // Note: For SSH hosts, we need to ensure username is properly mapped to user
      const hostData = {
        name: formData.name,
        description: formData.description || '',
        type: formData.type as 'ssh' | 'docker' | 'portainer',
        ip: formData.ip,
        port: parseInt(formData.port),
        user: formData.username, // Explicitly map username from form to user for the backend
        password: formData.password,
        status: 'connected' as const,
        created_at: new Date(),
        updated_at: new Date(),
        is_windows: false,
      };

      // Add debug logging to see what's actually being sent
      console.log('[@ConnectHostDialog] Host data before sending:', {
        ...hostData,
        password: hostData.password ? '[REDACTED]' : null,
      });

      const result = await createHost(hostData);

      if (result.success && result.data) {
        toast.success(t('success.connected', { name: formData.name }));
        resetForm();
        onOpenChange(false);

        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        console.error('Host creation failed with result:', result);
        toast.error(result.error || t('errors.createFailed'));
      }
    } catch (error) {
      console.error('Error creating connection:', error);
      toast.error(error instanceof Error ? error.message : t('errors.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleFormChange = (newFormData: FormData) => {
    const previousFormData = formData;
    setFormData(newFormData);

    // Only reset test status if connection-related fields change
    const connectionFieldsChanged =
      previousFormData.ip !== newFormData.ip ||
      previousFormData.port !== newFormData.port ||
      previousFormData.username !== newFormData.username ||
      previousFormData.password !== newFormData.password ||
      previousFormData.type !== newFormData.type;

    if (testStatus !== 'idle' && connectionFieldsChanged) {
      setTestStatus('idle');
      setTestError(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          resetForm();
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[500px] p-4">
        <DialogHeader className="pb-2">
          <DialogTitle>{t('addNewHost')}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm text-muted-foreground mb-4">
          {t('connectHostPrompt', { defaultValue: 'Enter the details to connect to a new host' })}
        </DialogDescription>

        <ClientConnectionForm
          formData={formData}
          onChange={handleFormChange}
          onTestSuccess={() => {
            setTestStatus('success');
          }}
          onSubmit={async () => {
            try {
              // Call the handleCreate function directly
              await handleCreate();

              // Add a small delay before closing the dialog to ensure the host list is updated
              await new Promise((resolve) => setTimeout(resolve, 500));

              return true; // Return a success value
            } catch (error) {
              console.error('Error in handleCreate:', error);
              return false; // Return a failure value
            }
          }}
          onCancel={() => onOpenChange(false)}
          isSaving={isCreating}
          testStatus={testStatus}
        />
      </DialogContent>
    </Dialog>
  );
}
