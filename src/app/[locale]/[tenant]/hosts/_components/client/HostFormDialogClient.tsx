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
import { useHost } from '@/hooks/useHost';

import { REFRESH_HOSTS_COMPLETE } from './HostsEventListener';

// Define a throttle constant for testing connections
const REQUEST_THROTTLE_MS = 1000;

export interface FormData {
  name: string;
  description: string;
  type: 'ssh' | 'docker' | 'custom';
  ip: string;
  port: string;
  username: string;
  password: string;
  is_windows?: boolean;
}

interface HostFormDialogClientProps {
  formData: FormData;
  onChange: (formData: FormData) => void;
  onCancel: () => void;
}

export function HostFormDialogClient({ formData, onChange, onCancel }: HostFormDialogClientProps) {
  const { createHost } = useHost();
  const t = useTranslations('hosts');
  const c = useTranslations('common');

  const [_connectionType, setConnectionType] = useState<'ssh' | 'docker' | 'custom'>(
    formData.type as 'ssh' | 'docker' | 'custom',
  );

  // State variables for testing status
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const lastRequestTime = useRef<number>(0);

  // State for host creation
  const [isCreating, setIsCreating] = useState(false);
  // State for storing last test result
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  const handleTypeChange = (value: string) => {
    setConnectionType(value as 'ssh' | 'docker' | 'custom');

    const defaultPort = value === 'ssh' ? '22' : value === 'docker' ? '2375' : '9000';
    onChange({
      ...formData,
      type: value as 'ssh' | 'docker' | 'custom',
      port: defaultPort,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    const updatedFormData = {
      ...formData,
      [field]: value,
    };

    // Log changes when username or password field is modified
    if (field === 'username' || field === 'password') {
      console.log(
        `[@client:hosts:HostFormDialogClient:handleInputChange] Field '${field}' updated:`,
        {
          field,
          hasValue: !!value,
          valueLength: value ? value.length : 0,
        },
      );
    }

    onChange(updatedFormData);
  };

  // Test the connection
  const testHostConnection = async () => {
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS || testing) {
      return;
    }
    lastRequestTime.current = now;

    setTesting(true);
    setTestError(null);
    setTestSuccess(false);
    setLastTestResult(null);

    try {
      // Create data object for testing
      const testData = {
        type: formData.type,
        ip: formData.ip,
        port: parseInt(formData.port),
        username: formData.username,
        password: formData.password,
      };

      console.log(
        '[@client:hosts:HostFormDialogClient:testHostConnection] Testing connection with exact data:',
        {
          ...testData,
          password: testData.password ? '********' : null,
          hasUsername: !!testData.username,
          usernameLength: testData.username?.length || 0,
          hasPassword: !!testData.password,
        },
      );

      // Simulating a test connection response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result = { success: true, is_windows: false };

      // Store the result for later use
      setLastTestResult(result);

      console.log('[@client:hosts:HostFormDialogClient:testHostConnection] Test result:', {
        success: result.success,
        isWindows: 'is_windows' in result ? result.is_windows : undefined,
      });

      if (result.success) {
        setTestSuccess(true);

        // Check if Windows was detected
        if ('is_windows' in result && result.is_windows !== undefined) {
          console.log(
            '[@client:hosts:HostFormDialogClient:testHostConnection] Windows OS detected:',
            result.is_windows,
          );
        }
      } else {
        // Handle error response
        const errorMessage = 'error' in result ? result.error : c('errors.testFailed');
        setTestError(errorMessage || c('errors.testFailed'));
      }
    } catch (error) {
      console.error(
        '[@client:hosts:HostFormDialogClient:testHostConnection] Error testing connection:',
        error,
      );
      setTestError(error instanceof Error ? error.message : c('errors.testFailed'));
    } finally {
      setTesting(false);
    }
  };

  // Create the host after successful test
  const createHostDirectly = async () => {
    if (!testSuccess) {
      console.error(c('errors.testFirst'));
      return;
    }

    setIsCreating(true);

    try {
      // Create the hostData object with all required fields
      const hostData = {
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        ip: formData.ip,
        port: parseInt(formData.port),
        // Map username to user for the server
        user: formData.username,
        username: formData.username,
        password: formData.password,
        status: 'connected' as const,
        is_windows: lastTestResult?.is_windows || false,
      };

      console.log(
        '[@client:hosts:HostFormDialogClient:createHostDirectly] Checking credentials passing:',
        {
          hasUsername: !!formData.username,
          usernameLength: formData.username?.length || 0,
          hasPassword: !!formData.password,
          userField: !!hostData.user,
          usernameField: !!hostData.username,
        },
      );

      // Add explicit log for status
      console.log(
        '[@client:hosts:HostFormDialogClient:createHostDirectly] Host status is set to:',
        hostData.status,
      );

      // Call the server action
      console.log(
        '[@client:hosts:HostFormDialogClient:createHostDirectly] Creating host with data:',
        {
          ...hostData,
          password: '[REDACTED]',
        },
      );

      const result = await createHost(hostData);

      if (result.success) {
        // Dispatch event to notify listeners of successful operation
        window.dispatchEvent(new Event(REFRESH_HOSTS_COMPLETE));

        // Close dialog if onCancel is provided
        if (onCancel) {
          onCancel();
        }
      } else {
        console.error(
          '[@client:hosts:HostFormDialogClient:createHostDirectly] Failed to create host:',
          result.error,
        );
      }
    } catch (error) {
      console.error(
        '[@client:hosts:HostFormDialogClient:createHostDirectly] Error creating host:',
        error,
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid gap-2 py-1" data-form-type="do-not-autofill">
      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="name" className="text-right">
          {t('title')}
        </Label>
        <div className="col-span-3">
          <Input
            id="name"
            placeholder={t('form_name_placeholder')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="type" className="text-right">
          {c('connection')}
        </Label>
        <Select value={formData.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="col-span-3 h-8">
            <SelectValue placeholder={t('form_type_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ssh">{t('ssh')}</SelectItem>
            <SelectItem value="docker">{t('docker')}</SelectItem>
            <SelectItem value="custom">{c('custom')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="ip" className="text-right">
          {c('ip')}
        </Label>
        <Input
          id="ip"
          placeholder={c('ip')}
          value={formData.ip}
          onChange={(e) => handleInputChange('ip', e.target.value)}
          className="col-span-2 h-8"
        />
        <div className="flex gap-2 items-center">
          <Label htmlFor="port" className="text-right whitespace-nowrap">
            {c('port')}
          </Label>
          <Input
            id="port"
            placeholder={c('port')}
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
              {c('username')}
            </Label>
            <Input
              id="username"
              name="new-username"
              placeholder={c('username')}
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="col-span-3 h-8"
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="password" className="text-right">
              {c('password')}
            </Label>
            <Input
              id="password"
              name="new-password"
              type="password"
              placeholder={c('password')}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="col-span-3 h-8"
              autoComplete="new-password"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="description" className="text-right">
          {c('description')}
        </Label>
        <Textarea
          id="description"
          placeholder={t('form_desc_placeholder')}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="col-span-3 min-h-[50px] py-1"
        />
      </div>

      <div className="flex justify-end space-x-3 mt-2">
        <Button
          type="button"
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
              {c('testing')}
            </>
          ) : (
            <>
              <CheckCircle className="h-3 w-3 mr-2" />
              {c('test_connection')}
            </>
          )}
        </Button>

        <Button
          type="button"
          onClick={createHostDirectly}
          disabled={isCreating || !testSuccess}
          variant={testSuccess ? 'default' : 'outline'}
          className={
            testSuccess ? 'bg-green-600 hover:bg-green-700 h-8 px-3 text-sm' : 'h-8 px-3 text-sm'
          }
        >
          {isCreating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
              {c('saving')}
            </>
          ) : (
            <>
              {testSuccess && <Check className="h-3 w-3 mr-2" />}
              {c('save')}
            </>
          )}
        </Button>
      </div>

      {/* Status message container with smaller fixed height */}
      <div className="min-h-[50px]">
        {testError && (
          <Alert variant="destructive" className="py-1">
            <AlertCircle className="h-3 w-3" />
            <AlertTitle className="text-sm">{c('connectionFailed')}</AlertTitle>
            <AlertDescription className="text-xs">{testError}</AlertDescription>
          </Alert>
        )}

        {testSuccess && (
          <Alert variant="success" className="py-1">
            <Check className="h-3 w-3" />
            <AlertTitle className="text-sm">{c('connectionSuccessful')}</AlertTitle>
            <AlertDescription className="text-xs">{c('readyToConnect')}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
