'use client';

import { AlertCircle, Check, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useState, useRef } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Textarea } from '@/components/shadcn/textarea';
import {
  verifyFingerprint as verifyFingerprintAction,
  testConnection as testConnectionAction,
} from '@/app/actions/hosts';

export interface FormData {
  name: string;
  description: string;
  type: string;
  ip: string;
  port: string;
  username: string;
  password: string;
  id?: string;
}

interface ConnectionFormProps {
  formData: FormData;
  onChange: (formData: FormData) => void;
  onTestSuccess?: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  testStatus?: 'idle' | 'success' | 'error';
}

export function ClientConnectionForm({
  formData,
  onChange,
  onTestSuccess,
  onSubmit,
  onCancel,
  isSaving = false,
  testStatus = 'idle',
}: ConnectionFormProps) {
  const t = useTranslations('Common');
  const [connectionType, setConnectionType] = useState<'ssh' | 'docker' | 'portainer'>(
    formData.type as 'ssh' | 'docker' | 'portainer',
  );

  // State variables for testing status
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [fingerprintData, setFingerprintData] = useState<{
    hostname: string;
    fingerprint: string;
  } | null>(null);
  const lastRequestTime = useRef<number>(0);
  const REQUEST_THROTTLE_MS = 500;

  // React.useEffect is defined but not needed anymore since we removed the context dependency

  const handleTypeChange = (value: string) => {
    setConnectionType(value as 'ssh' | 'docker' | 'portainer');

    const defaultPort = value === 'ssh' ? '22' : value === 'docker' ? '2375' : '9000';
    onChange({
      ...formData,
      type: value,
      port: defaultPort,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onTestSuccess?.();
    }
  };

  // Test the connection using the action directly since we don't have a host ID yet
  const testHostConnection = async () => {
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS || testing) {
      return;
    }
    lastRequestTime.current = now;

    setTesting(true);
    setTestError(null);
    setTestSuccess(false);

    try {
      const result = await testConnectionAction({
        type: formData.type,
        ip: formData.ip,
        port: parseInt(formData.port),
        username: formData.username,
        password: formData.password,
      });

      if (result.success) {
        setTestSuccess(true);
        if (onTestSuccess) {
          onTestSuccess();
        }
      } else {
        // Handle both types of error response formats
        const errorMessage = 'message' in result 
          ? result.message 
          : 'error' in result 
            ? result.error
            : t('errors.testFailed');
        setTestError(errorMessage);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestError(error instanceof Error ? error.message : t('errors.testFailed'));
    } finally {
      setTesting(false);
    }
  };

  // Verify host fingerprint
  const verifyHostFingerprint = async () => {
    if (!fingerprintData) return;

    setTesting(true);
    try {
      const result = await verifyFingerprintAction({
        host: fingerprintData.hostname,
        fingerprint: fingerprintData.fingerprint,
        port: parseInt(formData.port),
      });

      if (result.success) {
        setShowFingerprint(false);
        setTestSuccess(true);
      } else {
        setTestError(result.message || 'Failed to verify fingerprint');
        setShowFingerprint(false);
      }
    } catch (error: any) {
      setTestError(error.message || 'An unexpected error occurred');
      setShowFingerprint(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="grid gap-2 py-1">
      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="name" className="text-right">
          {t('name')}
        </Label>
        <div className="col-span-3">
          <Input
            id="name"
            placeholder={t('form.namePlaceholder')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="type" className="text-right">
          {t('connectionType')}
        </Label>
        <Select value={formData.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="col-span-3 h-8">
            <SelectValue placeholder={t('form.selectType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ssh">{t('ssh')}</SelectItem>
            <SelectItem value="docker">{t('docker')}</SelectItem>
            <SelectItem value="portainer">{t('portainer')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="ip" className="text-right">
          {t('ipAddress')}
        </Label>
        <Input
          id="ip"
          placeholder={t('ipAddress')}
          value={formData.ip}
          onChange={(e) => handleInputChange('ip', e.target.value)}
          className="col-span-2 h-8"
        />
        <div className="flex gap-2 items-center">
          <Label htmlFor="port" className="text-right whitespace-nowrap">
            {t('port')}
          </Label>
          <Input
            id="port"
            placeholder={t('port')}
            value={formData.port}
            onChange={(e) => handleInputChange('port', e.target.value)}
            className="w-20 h-8"
          />
        </div>
      </div>

      {formData.type === 'ssh' && (
        <>
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="username" className="text-right">
              {t('username')}
            </Label>
            <Input
              id="username"
              placeholder={t('username')}
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="col-span-3 h-8"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="password" className="text-right">
              {t('password')}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={t('password')}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="col-span-3 h-8"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="description" className="text-right">
          {t('description')}
        </Label>
        <Textarea
          id="description"
          placeholder={t('form.descriptionPlaceholder')}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="col-span-3 min-h-[50px] py-1"
        />
      </div>

      <div className="flex justify-end space-x-3 mt-2">
        <Button
          variant="outline"
          onClick={testHostConnection}
          disabled={
            testing ||
            !formData.name.trim() ||
            !formData.ip.trim() ||
            (formData.type === 'ssh' && (!formData.username.trim() || !formData.password.trim()))
          }
          className="h-8 px-3 text-sm"
        >
          {testing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
              {t('testing')}
            </>
          ) : (
            <>
              <CheckCircle className="h-3 w-3 mr-2" />
              {t('testConnection')}
            </>
          )}
        </Button>

        <Button
          onClick={async (e) => {
            e.preventDefault(); // Prevent any default form behavior

            // Check if onSubmit exists
            if (typeof onSubmit !== 'function') {
              console.error('onSubmit is not a function:', onSubmit);
              return;
            }

            try {
              await onSubmit();
            } catch (error) {
              console.error('Error executing onSubmit callback:', error);
            }
          }}
          disabled={isSaving || (!testSuccess && testStatus !== 'success')}
          variant={testSuccess || testStatus === 'success' ? 'default' : 'outline'}
          className={
            testSuccess || testStatus === 'success'
              ? 'bg-green-600 hover:bg-green-700 h-8 px-3 text-sm'
              : 'h-8 px-3 text-sm'
          }
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
              {t('saving')}
            </>
          ) : (
            <>
              {(testSuccess || testStatus === 'success') && <Check className="h-3 w-3 mr-2" />}
              {t('save')}
            </>
          )}
        </Button>
      </div>

      {/* Status message container with smaller fixed height */}
      <div className="min-h-[50px]">
        {testError && (
          <Alert variant="destructive" className="py-1">
            <AlertCircle className="h-3 w-3" />
            <AlertTitle className="text-sm">{t('connectionFailed')}</AlertTitle>
            <AlertDescription className="text-xs">{testError}</AlertDescription>
          </Alert>
        )}

        {testSuccess && (
          <Alert variant="success" className="py-1">
            <Check className="h-3 w-3" />
            <AlertTitle className="text-sm">{t('connectionSuccessful')}</AlertTitle>
            <AlertDescription className="text-xs">{t('readyToConnect')}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-end space-x-2 mt-1">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="h-8 px-3 text-sm"
          >
            {t('cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
