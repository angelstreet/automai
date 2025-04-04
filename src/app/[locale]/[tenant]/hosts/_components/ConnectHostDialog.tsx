import { useTranslations } from 'next-intl';
import { useState, useCallback } from 'react';
import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shadcn/dialog';
import { Host } from '@/types/component/hostComponentType';

import { ClientConnectionForm, FormData } from './client/ClientConnectionForm';

interface ConnectHostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (host: Host) => void;
}

export function ConnectHostDialog({
  open,
  onOpenChange,
  onSuccess: _onSuccess,
}: ConnectHostDialogProps) {
  const t = useTranslations('common');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [_testError, setTestError] = useState<string | null>(null);
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
    // Reset form with empty credentials
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
    
    // Reset any form autocomplete data
    setTimeout(() => {
      // Find and clear any username/password fields
      const usernameField = document.getElementById('username') as HTMLInputElement;
      const passwordField = document.getElementById('password') as HTMLInputElement;
      
      if (usernameField) usernameField.value = '';
      if (passwordField) passwordField.value = '';
    }, 0);
  }, []);

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
          onCancel={() => onOpenChange(false)}
          testStatus={testStatus}
        />
      </DialogContent>
    </Dialog>
  );
}
