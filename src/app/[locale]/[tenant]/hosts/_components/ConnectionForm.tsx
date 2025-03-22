import { AlertCircle, Check, CheckCircle, Loader2, ShieldAlert, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useState, useRef, useEffect } from 'react';

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
import { verifyFingerprint as verifyFingerprintAction, testConnection as testConnectionAction } from '../actions';

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

export function ConnectionForm({ 
  formData, 
  onChange,
  onTestSuccess,
  onSubmit,
  onCancel,
  isSaving = false,
  testStatus = 'idle'
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
  const { locale, tenant } = useParams() as { locale: string; tenant: string };
  const lastRequestTime = useRef<number>(0);
  const REQUEST_THROTTLE_MS = 500;

  // Synchronize testSuccess with testStatus
  useEffect(() => {
    // If testStatus changes to success, update internal testSuccess
    if (testStatus === 'success' && !testSuccess) {
      setTestSuccess(true);
    }
    
    // If internal testSuccess becomes true, call onTestSuccess to update parent
    if (testSuccess && testStatus !== 'success' && onTestSuccess) {
      onTestSuccess();
    }
  }, [testSuccess, testStatus, onTestSuccess]);

  // Handle connection type change
  const handleTypeChange = (value: string) => {
    setConnectionType(value as 'ssh' | 'docker' | 'portainer');
    
    // Update form data with the new type and default port
    const defaultPort = value === 'ssh' ? '22' : value === 'docker' ? '2375' : '9000';
    onChange({
      ...formData,
      type: value,
      port: defaultPort,
    });
  };

  // Handle input change for any field
  const handleInputChange = (field: string, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  // Handle enter key to submit form
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onTestSuccess?.();
    }
  };

  // Test the connection using the provided function
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
        // Make sure we call the parent's onTestSuccess to update testStatus
        if (onTestSuccess) {
          onTestSuccess();
        }
      } else {
        setTestError(result.message || t('errors.testFailed'));
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
        port: parseInt(formData.port)
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
    <div className="grid gap-3 py-2">
      <div className="grid grid-cols-4 items-center gap-3">
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

      <div className="grid grid-cols-4 items-center gap-3">
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

      <div className="grid grid-cols-4 items-center gap-3">
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
          <div className="grid grid-cols-4 items-center gap-3">
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
          <div className="grid grid-cols-4 items-center gap-3">
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

      <div className="grid grid-cols-4 items-center gap-3">
        <Label htmlFor="description" className="text-right">
          {t('description')}
        </Label>
        <Textarea
          id="description"
          placeholder={t('form.descriptionPlaceholder')}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="col-span-3 min-h-[60px] py-1"
        />
      </div>

      <div className="flex justify-end space-x-3 mt-3">
        <Button variant="outline" onClick={testHostConnection} disabled={testing} className="h-8 px-3 text-sm">
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
              const result = await onSubmit();
            } catch (error) {
              console.error('Error executing onSubmit callback:', error);
            }
          }} 
          disabled={isSaving || (!testSuccess && testStatus !== 'success')} 
          variant={(testSuccess || testStatus === 'success') ? "default" : "outline"}
          className={(testSuccess || testStatus === 'success') ? "bg-green-600 hover:bg-green-700 h-8 px-3 text-sm" : "h-8 px-3 text-sm"}
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

      {testError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertTitle className="text-sm">{t('connectionFailed')}</AlertTitle>
          <AlertDescription className="text-xs">{testError}</AlertDescription>
        </Alert>
      )}

      {testSuccess && (
        <Alert variant="success" className="py-2">
          <Check className="h-3 w-3" />
          <AlertTitle className="text-sm">{t('connectionSuccessful')}</AlertTitle>
          <AlertDescription className="text-xs">{t('readyToConnect')}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-2 mt-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSaving} className="h-8 px-3 text-sm">
            {t('cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
