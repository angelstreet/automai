import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
/* eslint-disable @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars */
import { useTranslations } from 'next-intl';
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import * as React from 'react';

import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
import { addHost, testConnection } from '../actions';
import { Host } from '../types';

import { ConnectionForm, FormData } from './ConnectionForm';

interface ConnectHostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (host: Host) => void;
}

export function ConnectHostDialog({ open, onOpenChange, onSuccess }: ConnectHostDialogProps) {
  const t = useTranslations('Common');
  const params = useParams();
  const locale = params.locale as string;
  const [isCreating, setIsCreating] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
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
    if (!validateFormData()) return;

    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS) {
      return;
    }
    lastRequestTime.current = now;

    setIsCreating(true);
    try {
      const result = await addHost({
        name: formData.name,
        description: formData.description || '',
        type: formData.type as 'ssh' | 'docker' | 'portainer',
        ip: formData.ip,
        port: parseInt(formData.port),
        user: formData.username,
        password: formData.password,
        status: 'connected',
        created_at: new Date(),
        updated_at: new Date(),
        is_windows: false
      });

      toast.success(t('success.connected', { name: formData.name }));
      resetForm();
      onOpenChange(false);

      if (onSuccess && result.success && result.data) {
        onSuccess(result.data);
      }
    } catch (error) {
      console.error('Error creating connection:', error);
      toast.error(error instanceof Error ? error.message : t('errors.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleFormChange = (newFormData: FormData) => {
    setFormData(newFormData);
    if (testStatus !== 'idle') {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('addNewHost')}</DialogTitle>
        </DialogHeader>

        <ConnectionForm
          formData={formData}
          onChange={handleFormChange}
          onTestSuccess={() => setTestStatus('success')}
          onSubmit={handleCreate}
          onCancel={() => onOpenChange(false)}
          isSaving={isCreating}
          testStatus={testStatus}
        />
      </DialogContent>
    </Dialog>
  );
}
  