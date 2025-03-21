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
import { useHost } from '@/context';
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
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: () => void;
  isSaving?: boolean;
}

export function ConnectionForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  isSaving = false 
}: ConnectionFormProps) {
  const t = useTranslations('Common');
  const { testConnection } = useHost();
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

  // Handle connection type change
  const handleTypeChange = (value: string) => {
    setConnectionType(value as 'ssh' | 'docker' | 'portainer');
    
    // Update form data with the new type and default port
    const defaultPort = value === 'ssh' ? '22' : value === 'docker' ? '2375' : '9000';
    setFormData({
      ...formData,
      type: value,
      port: defaultPort,
    });
  };

  // Handle input change for any field
  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  // Handle enter key to submit form
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Test the connection
  const testHostConnection = async () => {
    if (testing) return;

    // Reset status
    setTesting(true);
    setTestError(null);
    setTestSuccess(false);
    setShowFingerprint(false);

    try {
      // Create a test host object
      const testHost = {
        name: formData.name || 'Test Connection',
        type: formData.type as 'ssh' | 'docker' | 'portainer',
        ip: formData.ip,
        port: parseInt(formData.port),
        user: formData.username,
        password: formData.password,
      };

      // Test the connection - this will be replaced by testConnection from the context
      const result = await testConnection(testHost);

      if (result.success) {
        setTestSuccess(true);
        setTestError(null);
      } else if (result.fingerprint) {
        // Show fingerprint confirmation
        setShowFingerprint(true);
        setFingerprintData({
          hostname: formData.ip,
          fingerprint: result.fingerprint,
        });
      } else {
        setTestError(result.error || 'Connection failed');
      }
    } catch (error: any) {
      setTestError(error.message || 'An unexpected error occurred');
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
        tenant_id: tenant,
      });

      if (result.success) {
        setShowFingerprint(false);
        setTestSuccess(true);
      } else {
        setTestError(result.error || 'Failed to verify fingerprint');
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
    <div className="grid gap-6">
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="name">{t('name')}</Label>
          <Input
            id="name"
            placeholder="My Host"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="description">{t('description')}</Label>
          <Textarea
            id="description"
            placeholder="Description of this host"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="h-20"
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="type">{t('connectionType')}</Label>
          <Select
            value={connectionType}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select connection type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ssh">SSH</SelectItem>
              <SelectItem value="docker">Docker</SelectItem>
              <SelectItem value="portainer">Portainer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="ip">{t('ipAddress')}</Label>
          <Input
            id="ip"
            placeholder="192.168.1.1"
            value={formData.ip}
            onChange={(e) => handleInputChange('ip', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="port">{t('port')}</Label>
          <Input
            id="port"
            placeholder={connectionType === 'ssh' ? '22' : connectionType === 'docker' ? '2375' : '9000'}
            value={formData.port}
            onChange={(e) => handleInputChange('port', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        {connectionType === 'ssh' && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input
                id="username"
                placeholder="root"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </>
        )}
        
        {testError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('connectionFailed')}</AlertTitle>
            <AlertDescription className="mt-2 text-sm whitespace-pre-wrap">
              {testError}
            </AlertDescription>
          </Alert>
        )}
        
        {testSuccess && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-800">{t('connectionSuccessful')}</AlertTitle>
            <AlertDescription className="text-green-700">
              {t('readyToConnect')}
            </AlertDescription>
          </Alert>
        )}
        
        {showFingerprint && fingerprintData && (
          <Alert className="border-yellow-500 bg-yellow-50">
            <ShieldAlert className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-800">{t('verifyFingerprint')}</AlertTitle>
            <AlertDescription className="text-yellow-700">
              <p className="mb-2">
                {t('hostKeyChanged', { hostname: fingerprintData.hostname })}
              </p>
              <div className="bg-yellow-100 p-2 rounded-md font-mono text-xs mb-2">
                {fingerprintData.fingerprint}
              </div>
              <div className="flex space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={verifyHostFingerprint}
                  disabled={testing}
                  className="text-green-700 border-green-300 hover:text-green-800 hover:bg-green-50"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {t('accept')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFingerprint(false)}
                  disabled={testing}
                  className="text-red-700 border-red-300 hover:text-red-800 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('reject')}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={testHostConnection}
          disabled={!formData.ip || testing || isSaving}
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('testing')}
            </>
          ) : (
            t('testConnection')
          )}
        </Button>
        
        <Button 
          type="button" 
          onClick={onSubmit} 
          disabled={!formData.name || !formData.ip || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>
      </div>
    </div>
  );
}
