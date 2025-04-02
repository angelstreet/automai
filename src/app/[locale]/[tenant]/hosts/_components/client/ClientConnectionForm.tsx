'use client';

import { AlertCircle, Check, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

import {
  testConnection as testConnectionAction,
  createHost as createHostAction,
} from '@/app/actions/hostsAction';
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

import { REQUEST_THROTTLE_MS } from './constants';

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
  onCancel?: () => void;
  testStatus?: 'idle' | 'success' | 'error';
}

export function ClientConnectionForm({
  formData,
  onChange,
  onTestSuccess,
  onCancel,
  testStatus = 'idle',
}: ConnectionFormProps) {
  const t = useTranslations('Common');
  const [_connectionType, setConnectionType] = useState<'ssh' | 'docker' | 'portainer'>(
    formData.type as 'ssh' | 'docker' | 'portainer',
  );

  // State variables for testing status
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const lastRequestTime = useRef<number>(0);

  // State for host creation
  const [isCreating, setIsCreating] = useState(false);

  // State for Windows detection
  const [isWindowsOS, setIsWindowsOS] = useState<boolean | undefined>(undefined);

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
    const updatedFormData = {
      ...formData,
      [field]: value,
    };

    // Log changes when username or password field is modified
    if (field === 'username' || field === 'password') {
      console.log(`[@ui:ClientConnectionForm:handleInputChange] Field '${field}' updated:`, {
        field,
        hasValue: !!value,
        valueLength: value ? value.length : 0,
      });
    }

    onChange(updatedFormData);
  };

  // Test the connection using the action directly
  const testHostConnection = async () => {
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS || testing) {
      return;
    }
    lastRequestTime.current = now;

    setTesting(true);
    setTestError(null);
    setTestSuccess(false);
    setIsWindowsOS(undefined); // Reset Windows detection

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
        '[@ui:ClientConnectionForm:testHostConnection] Testing connection with exact data:',
        {
          ...testData,
          password: testData.password ? '********' : null,
          hasUsername: !!testData.username,
          usernameLength: testData.username?.length || 0,
          hasPassword: !!testData.password,
        },
      );

      const result = await testConnectionAction(testData);

      console.log('[@ui:ClientConnectionForm:testHostConnection] Test result:', {
        success: result.success,
        isWindows: 'is_windows' in result ? result.is_windows : undefined,
      });

      if (result.success) {
        setTestSuccess(true);

        // Check if Windows was detected
        if ('is_windows' in result && result.is_windows !== undefined) {
          console.log(
            '[@ui:ClientConnectionForm:testHostConnection] Windows OS detected:',
            result.is_windows,
          );
          setIsWindowsOS(result.is_windows);
        }

        if (onTestSuccess) {
          onTestSuccess();
        }
      } else {
        // Handle error response
        const errorMessage =
          'message' in result
            ? result.message
            : 'error' in result
              ? result.error
              : t('errors.testFailed');
        setTestError(errorMessage);
      }
    } catch (error) {
      console.error(
        '[@ui:ClientConnectionForm:testHostConnection] Error testing connection:',
        error,
      );
      setTestError(error instanceof Error ? error.message : t('errors.testFailed'));
    } finally {
      setTesting(false);
    }
  };

  // Create the host after successful test
  const createHostDirectly = async () => {
    if (!testSuccess && testStatus !== 'success') {
      toast.error(t('errors.testFirst'));
      return;
    }

    setIsCreating(true);

    try {
      // Create the hostData object with all required fields
      const hostData = {
        name: formData.name,
        description: formData.description || '',
        type: formData.type as 'ssh' | 'docker' | 'portainer',
        ip: formData.ip,
        port: parseInt(formData.port),
        // Map username to user for the server - this is critical!
        user: formData.username,
        // Also include username field as a backup
        username: formData.username,
        password: formData.password,
        // CRITICAL: Explicitly set status to 'connected' (NOT 'pending')
        status: 'connected' as 'connected',
        is_windows: isWindowsOS !== undefined ? isWindowsOS : false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log('[@ui:ClientConnectionForm:createHostDirectly] Checking credentials passing:', {
        hasUsername: !!formData.username,
        usernameLength: formData.username?.length || 0,
        hasPassword: !!formData.password,
        userField: !!hostData.user,
        usernameField: !!hostData.username,
      });

      // Add explicit log for status
      console.log(
        '[@ui:ClientConnectionForm:createHostDirectly] Host status is set to:',
        hostData.status,
      );

      // Call the server action
      console.log('[@ui:ClientConnectionForm:createHostDirectly] Creating host with data:', {
        ...hostData,
        password: '[REDACTED]',
      });
      const result = await createHostAction(hostData as any);

      if (result.success && result.data) {
        toast.success(t('success.connected', { name: formData.name }));

        // Trigger refresh of host list without testing all connections
        window.dispatchEvent(
          new CustomEvent('refresh-hosts', {
            detail: { testConnections: false },
          }),
        );

        // Close dialog if onCancel is provided
        if (onCancel) {
          onCancel();
        }
      } else {
        toast.error(result.error || t('errors.createFailed'));
        console.error(
          '[@ui:ClientConnectionForm:createHostDirectly] Failed to create host:',
          result.error,
        );
      }
    } catch (error) {
      console.error('[@ui:ClientConnectionForm:createHostDirectly] Error creating host:', error);
      toast.error(error instanceof Error ? error.message : t('errors.createFailed'));
    } finally {
      setIsCreating(false);
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
          onClick={createHostDirectly}
          disabled={isCreating || (!testSuccess && testStatus !== 'success')}
          variant={testSuccess || testStatus === 'success' ? 'default' : 'outline'}
          className={
            testSuccess || testStatus === 'success'
              ? 'bg-green-600 hover:bg-green-700 h-8 px-3 text-sm'
              : 'h-8 px-3 text-sm'
          }
        >
          {isCreating ? (
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
    </div>
  );
}
