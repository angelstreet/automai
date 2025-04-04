'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useHost } from '@/hooks/useHost';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';
import { Switch } from '@/components/shadcn/switch';
import { Textarea } from '@/components/shadcn/textarea';
import { UserAuthForm } from '@/components/shadcn/user-auth-form';

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
  const { createHost, isCreating } = useHost();
  const t = useTranslations('hosts');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Helper to update form data
  const updateFormData = (updates: Partial<FormData>) => {
    onChange({ ...formData, ...updates });
  };

  // Set default port when connection type changes
  const handleTypeChange = (value: 'ssh' | 'docker' | 'custom') => {
    let defaultPort = '22';
    if (value === 'docker') defaultPort = '2375';
    if (value === 'custom') defaultPort = '9000';

    updateFormData({ type: value, port: defaultPort });
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      // Validate form data
      if (!formData.name) {
        setFormError('Name is required');
        setIsSubmitting(false);
        return;
      }

      if (!formData.ip) {
        setFormError('IP Address/Hostname is required');
        setIsSubmitting(false);
        return;
      }

      // For SSH connections, username and password are required
      if (formData.type === 'ssh' && (!formData.username || !formData.password)) {
        setFormError('Username and password are required for SSH connections');
        setIsSubmitting(false);
        return;
      }

      // Prepare host data
      const hostData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        ip: formData.ip,
        port:
          parseInt(formData.port, 10) ||
          (formData.type === 'ssh' ? 22 : formData.type === 'docker' ? 2375 : 9000),
        user: formData.username,
        password: formData.password,
        is_windows: formData.is_windows || false,
        status: 'pending' as const,
      };

      // Create the host using the mutation
      const result = await createHost(hostData);

      if (result.success) {
        // Close the form
        onCancel();
      } else {
        setFormError(result.error || 'Failed to create host');
      }
    } catch (error: any) {
      console.error('[@client:hosts:HostFormDialogClient] Error creating host:', error);
      setFormError(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('host_name', { fallback: 'Name' })}</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="My Server"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('host_description', { fallback: 'Description' })}</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            placeholder="Production server in US East"
            rows={2}
          />
        </div>
      </div>

      {/* Connection Type */}
      <div className="space-y-2">
        <Label>{t('connection_type', { fallback: 'Connection Type' })}</Label>
        <RadioGroup
          value={formData.type}
          onValueChange={(value) => handleTypeChange(value as 'ssh' | 'docker' | 'custom')}
          className="flex flex-col space-y-1"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ssh" id="ssh" />
            <Label htmlFor="ssh" className="cursor-pointer">
              {t('ssh_connection', { fallback: 'SSH' })}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="docker" id="docker" />
            <Label htmlFor="docker" className="cursor-pointer">
              {t('docker_connection', { fallback: 'Docker' })}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="cursor-pointer">
              {t('custom_connection', { fallback: 'Custom' })}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Connection Details */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ip">{t('host_address', { fallback: 'IP Address/Hostname' })}</Label>
          <Input
            id="ip"
            value={formData.ip}
            onChange={(e) => updateFormData({ ip: e.target.value })}
            placeholder="192.168.1.100 or example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="port">{t('port', { fallback: 'Port' })}</Label>
          <Input
            id="port"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.port}
            onChange={(e) => updateFormData({ port: e.target.value })}
            placeholder="22"
          />
        </div>

        {formData.type === 'ssh' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="username">{t('username', { fallback: 'Username' })}</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => updateFormData({ username: e.target.value })}
                placeholder="root"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password', { fallback: 'Password' })}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => updateFormData({ password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_windows"
                checked={formData.is_windows}
                onCheckedChange={(checked) => updateFormData({ is_windows: checked })}
              />
              <Label htmlFor="is_windows" className="cursor-pointer">
                {t('is_windows', { fallback: 'Windows Server' })}
              </Label>
            </div>
          </>
        )}
      </div>

      {/* Error message */}
      {formError && <div className="text-destructive text-sm">{formError}</div>}

      {/* Test connection result */}
      {testConnectionResult && (
        <div
          className={`p-3 rounded-md ${
            testConnectionResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {testConnectionResult.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('cancel', { fallback: 'Cancel' })}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t('creating_host', { fallback: 'Creating...' })
            : t('create_host', { fallback: 'Create Host' })}
        </Button>
      </div>
    </form>
  );
}
