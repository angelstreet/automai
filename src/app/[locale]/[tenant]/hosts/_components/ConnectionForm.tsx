import { AlertCircle, Check, CheckCircle, Loader2, ShieldAlert, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useState, useRef } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert';
import { Badge } from '@/components/shadcn/badge';
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
import { useHosts } from '../hooks';
import { verifyFingerprint as verifyFingerprintAction } from '../actions';

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
  onSave?: () => void;
  onTestSuccess?: () => void;
  isSaving?: boolean;
}

export function ConnectionForm({ formData, onChange, onSave, onTestSuccess, isSaving = false }: ConnectionFormProps) {
  const t = useTranslations('Common');
  const { testConnection } = useHosts();
  const [connectionType, setConnectionType] = useState<'ssh' | 'docker' | 'portainer'>(
    formData.type as 'ssh' | 'docker' | 'portainer',
  );

  // State variables for testing status
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const lastRequestTime = useRef<number>(0);
  const REQUEST_THROTTLE_MS = 500; // minimum time between requests

  // State for fingerprint verification
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [fingerprintVerified, setFingerprintVerified] = useState(false);
  const [requireVerification, setRequireVerification] = useState(false);
  const [verifyingFingerprint, setVerifyingFingerprint] = useState(false);

  // State for test status
  const [testStatus, setTestStatus] = useState<'error' | 'success'>('error');

  const handleTypeChange = (value: string) => {
    setConnectionType(value as 'ssh' | 'docker' | 'portainer' | 'docker' | 'portainer');
    onChange({
      ...formData,
      type: value,
      port: value === 'ssh' ? '22' : value === 'docker' ? '2375' : '9000',
    });
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'name') {
      // Only allow lowercase letters, numbers, and hyphens
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    }
    onChange({ ...formData, [field]: value });
  };

  // Handle keydown event to trigger test connection on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !testing) {
      e.preventDefault();
      testHostConnection();
    }
  };

  // Update the testConnection function to use the API service
  const testHostConnection = async () => {
    // Throttle requests
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS || testing) {
      return;
    }
    lastRequestTime.current = now;

    setTesting(true);
    setTestError(null);
    setTestSuccess(false);
    setFingerprint(null);
    setRequireVerification(false);
    setFingerprintVerified(false);

    // Set initial failed state (red)
    setTestStatus('error');

    // Small delay to show the red state
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const data = await testConnection({
        type: formData.type,
        ip: formData.ip,
        port: parseInt(formData.port),
        username: formData.username,
        password: formData.password,
      });

      if (data.requireVerification) {
        setRequireVerification(true);
        setFingerprint(data.fingerprint || null);
        setTestError(data.message || null);
      } else if (data.success) {
        setTestSuccess(true);
        setTestStatus('success');
        if (data.fingerprint) {
          setFingerprint(data.fingerprint);
          setFingerprintVerified(data.fingerprintVerified || false);
        }
        if (onTestSuccess) {
          onTestSuccess();
        }
      } else {
        setTestError(data.message || null);
        setTestStatus('error');
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Failed to test connection');
      setTestStatus('error');
      console.error('Error testing connection:', error);
    } finally {
      setTesting(false);
    }
  };

  // Update verifyFingerprint to use the API service
  const verifyHostFingerprint = async () => {
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS || testing) {
      return;
    }
    lastRequestTime.current = now;

    setTesting(true);
    setTestError(null);

    try {
      if (!fingerprint) {
        setTestError('Fingerprint is required');
        return;
      }

      setVerifyingFingerprint(true);
      const data = await verifyFingerprintAction({
        fingerprint: fingerprint,
        host: formData.ip,
        port: parseInt(formData.port),
      });

      if (data.success) {
        setTestSuccess(true);
        setFingerprintVerified(true);
        setRequireVerification(false);
        if (onTestSuccess) {
          onTestSuccess();
        }
      } else {
        setTestError(data.message || null);
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Failed to verify fingerprint');
      console.error('Error verifying fingerprint:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3 py-2">
      <form onKeyDown={handleKeyDown} onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-12 items-center gap-3">
          <Label htmlFor="name" className="text-right col-span-2">
            {t('form.name')}
          </Label>
          <div className="col-span-10 space-y-1">
            <Input
              id="name"
              placeholder={t('form.namePlaceholder')}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{t('form.nameHint')}</p>
          </div>
        </div>

        <div className="grid grid-cols-12 items-center gap-3 mt-3">
          <Label htmlFor="type" className="text-right col-span-2 whitespace-nowrap">
            {t('form.connection')}
          </Label>
          <div className="col-span-10">
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('form.selectType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ssh">{t('ssh')}</SelectItem>
                <SelectItem value="docker">{t('docker')}</SelectItem>
                <SelectItem value="portainer">{t('portainer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-12 items-center gap-3 mt-3">
          <Label htmlFor="ip" className="text-right col-span-2 whitespace-nowrap">
            {t('form.ipAddress')}
          </Label>
          <Input
            id="ip"
            placeholder={t('form.ipAddress')}
            value={formData.ip}
            onChange={(e) => handleInputChange('ip', e.target.value)}
            className="col-span-7"
          />
          <Label htmlFor="port" className="text-right whitespace-nowrap col-span-1">
            {t('form.port')}
          </Label>
          <Input
            id="port"
            placeholder={t('form.port')}
            value={formData.port}
            onChange={(e) => handleInputChange('port', e.target.value)}
            className="col-span-2"
          />
        </div>

        {connectionType === 'ssh' && (
          <>
            <div className="grid grid-cols-12 items-center gap-3 mt-3">
              <Label htmlFor="username" className="text-right col-span-2 whitespace-nowrap">
                {t('form.username')}
              </Label>
              <Input
                id="username"
                placeholder={t('form.username')}
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="col-span-10"
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-3 mt-3">
              <Label htmlFor="password" className="text-right col-span-2 whitespace-nowrap">
                {t('form.password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t('form.password')}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="col-span-10"
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-12 items-center gap-3 mt-3">
          <Label htmlFor="description" className="text-right col-span-2">
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="col-span-10 h-16"
          />
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={testHostConnection} disabled={testing} type="button">
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('testing')}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('testConnection')}
              </>
            )}
          </Button>

          {onSave && (
            <Button onClick={onSave} disabled={testing || isSaving} type="button">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          )}
        </div>
      </form>

      {requireVerification && fingerprint && (
        <Alert className="mt-4">
          <AlertTitle className="flex items-center">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Host Key Verification Failed
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm text-muted-foreground">
              The authenticity of host &apos;{formData.ip}&apos; can&apos;t be established.
            </p>
            <p className="mb-2">
              Fingerprint: <code className="bg-muted p-1 rounded">{fingerprint}</code>
            </p>
            <p className="mb-4">Are you sure you want to continue connecting?</p>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={verifyHostFingerprint}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Yes, trust this host
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRequireVerification(false)}>
                <X className="h-4 w-4 mr-2" />
                No, cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {testError && !requireVerification && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Connection Failed
          </AlertTitle>
          <AlertDescription>{testError}</AlertDescription>
        </Alert>
      )}

      {testSuccess && (
        <Alert className="mt-4" variant="success">
          <AlertTitle className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            Connection Successful
          </AlertTitle>
          <AlertDescription>
            <p>Successfully connected to the remote host</p>
            {fingerprint && (
              <p className="mt-2">
                <span className="font-medium">Host fingerprint:</span>{' '}
                <code className="bg-muted p-1 rounded">{fingerprint}</code>{' '}
                {fingerprintVerified && (
                  <Badge variant="outline" className="ml-2">
                    Verified
                  </Badge>
                )}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
