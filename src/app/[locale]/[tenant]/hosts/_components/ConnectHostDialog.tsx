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
  DialogFooter,
  DialogDescription,
} from '@/components/shadcn/dialog';
import { hostsApi } from '@/app/actions/hosts';
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
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const lastRequestTime = useRef<number>(0);
  const REQUEST_THROTTLE_MS = 500; // minimum time between requests
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Throttle requests
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS) {
      return;
    }
    lastRequestTime.current = now;

    setIsCreating(true);
    try {
      const host = await hostsApi.createHost({
        name: formData.name,
        description: formData.description || '',
        type: 'ssh',
        ip: formData.ip,
        port: parseInt(formData.port),
        user: formData.username,
        password: formData.password,
        status: 'connected', // Set to connected by default
      });

      toast.success(t('success.connected', { name: formData.name }));

      resetForm();
      onOpenChange(false);

      if (onSuccess) {
        onSuccess(host);
      }
    } catch (error) {
      console.error('Error creating connection:', error);
      toast.error(error instanceof Error ? error.message : t('errors.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const getDetailedErrorMessage = (errorData: any): string => {
    if (!errorData) return t('errors.unknownError');

    if (errorData.message) {
      const message = errorData.message;

      if (message.includes('timeout')) {
        return t('errors.timeout');
      }

      if (message.includes('refused')) {
        return t('errors.refused');
      }

      if (message.includes('authentication') || message.includes('password')) {
        return t('errors.authentication');
      }

      return message;
    }

    return t('errors.hostConnection');
  };

  const testConnection = async (): Promise<boolean> => {
    if (!validateFormData()) return false;

    // Throttle requests
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS) {
      return false;
    }
    lastRequestTime.current = now;

    setIsTesting(true);
    setTestStatus('idle');
    setTestError(null);

    try {
      const data = await hostsApi.testConnection({
        type: 'ssh',
        ip: formData.ip,
        port: parseInt(formData.port),
        username: formData.username,
        password: formData.password,
      });

      if (data.success) {
        setTestStatus('success');
        return true;
      } else {
        setTestStatus('error');
        const errorMessage = getDetailedErrorMessage(data);
        setTestError(errorMessage || t('errors.testFailed'));
        return false;
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestStatus('error');
      setTestError(error instanceof Error ? error.message : t('errors.testFailed'));
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleFormChange = (newFormData: FormData) => {
    setFormData(newFormData);
    if (testStatus !== 'idle') {
      setTestStatus('idle');
      setTestError(null);
    }
  };

  const isFormValid = (): boolean => {
    if (!formData.name.trim() || !formData.ip.trim()) return false;

    if (formData.type === 'ssh' && (!formData.username.trim() || !formData.password.trim())) {
      return false;
    }

    return true;
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect to Host</DialogTitle>
          <DialogDescription>Enter the connection details for your host.</DialogDescription>
        </DialogHeader>

        <ConnectionForm
          formData={formData}
          onChange={handleFormChange}
          onTestSuccess={() => setTestStatus('success')}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isFormValid() || isCreating || testStatus !== 'success'}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
