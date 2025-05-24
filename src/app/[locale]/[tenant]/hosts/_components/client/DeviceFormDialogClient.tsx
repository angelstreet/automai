'use client';

import { Check, Loader2, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useState } from 'react';

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

import { HostsEvents } from './HostEventListener';

export interface DeviceFormData {
  name: string;
  description: string;
  ip: string;
  ip_local: string;
  device_type: string;
  host_id: string; // ADB host selection - required for Android devices
}

interface DeviceFormDialogClientProps {
  formData: DeviceFormData;
  onChange: (formData: DeviceFormData) => void;
  onCancel: () => void;
}

export function DeviceFormDialogClient({
  formData,
  onChange,
  onCancel,
}: DeviceFormDialogClientProps) {
  const { createHost, hosts } = useHost();
  const c = useTranslations('common');

  // State for device creation
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Get available SSH hosts for ADB selection
  const sshHosts =
    hosts?.filter((host) => host.type === 'ssh' && host.status === 'connected') || [];

  const handleInputChange = (field: string, value: string) => {
    console.log(
      `[@client:DeviceFormDialogClient:handleInputChange] Field '${field}' changed to:`,
      value,
    );

    const updatedFormData = {
      ...formData,
      [field]: value,
    };

    console.log(
      '[@client:DeviceFormDialogClient:handleInputChange] Updated form data:',
      updatedFormData,
    );
    onChange(updatedFormData);
  };

  const handleDeviceTypeChange = (value: string) => {
    console.log(
      '[@client:DeviceFormDialogClient:handleDeviceTypeChange] Device type changed to:',
      value,
    );

    const updatedFormData = {
      ...formData,
      device_type: value,
    };

    console.log(
      '[@client:DeviceFormDialogClient:handleDeviceTypeChange] Updated form data:',
      updatedFormData,
    );
    onChange(updatedFormData);
  };

  const handleHostChange = (value: string) => {
    console.log('[@client:DeviceFormDialogClient:handleHostChange] Host changed to:', value);

    const updatedFormData = {
      ...formData,
      host_id: value,
    };

    console.log(
      '[@client:DeviceFormDialogClient:handleHostChange] Updated form data:',
      updatedFormData,
    );
    onChange(updatedFormData);
  };

  // Create device directly without testing
  const createDevice = async () => {
    setIsCreating(true);
    setCreateError(null);

    try {
      // Log the form data first
      console.log('[@client:DeviceFormDialogClient:createDevice] Form data before processing:', {
        name: formData.name,
        description: formData.description,
        ip: formData.ip,
        ip_local: formData.ip_local,
        device_type: formData.device_type,
        host_id: formData.host_id,
      });

      // Create the deviceData object for non-SSH devices
      const deviceData = {
        name: formData.name,
        description: formData.description || '',
        type: 'device' as const, // Use 'device' type to bypass SSH validation
        ip: formData.ip,
        ip_local: formData.ip_local, // Local IP should be passed through
        device_type: formData.device_type, // Device type should be passed through
        host_id: formData.host_id, // ADB host for Android devices
        // NO PORT FIELD - let database use default (null)
        user: undefined, // No SSH user needed for devices
        username: undefined, // No SSH username needed for devices
        auth_type: undefined, // No authentication for devices
        password: undefined, // No password needed for devices
        private_key: undefined, // No private key needed for devices
        status: 'pending' as const, // Devices start as pending (no verification)
        is_windows: false, // Devices are not Windows hosts
      };

      // Log the exact data being sent to createHost
      console.log(
        '[@client:DeviceFormDialogClient:createDevice] Device data being sent to createHost:',
        {
          name: deviceData.name,
          description: deviceData.description,
          type: deviceData.type,
          ip: deviceData.ip,
          ip_local: deviceData.ip_local,
          device_type: deviceData.device_type,
          port: 'NOT INCLUDED (will default to null)',
          user: deviceData.user,
          username: deviceData.username,
          auth_type: deviceData.auth_type,
          password: deviceData.password,
          private_key: deviceData.private_key,
          status: deviceData.status,
          is_windows: deviceData.is_windows,
        },
      );

      // Call the server action
      const result = await createHost(deviceData);

      console.log('[@client:DeviceFormDialogClient:createDevice] CreateHost result:', result);

      if (result.success) {
        console.log(
          '[@client:DeviceFormDialogClient:createDevice] Device created successfully with data:',
          result.data,
        );

        // Dispatch event to notify listeners of successful operation
        window.dispatchEvent(new Event(HostsEvents.REFRESH_HOSTS));

        // Close dialog if onCancel is provided
        if (onCancel) {
          onCancel();
        }
      } else {
        console.error(
          '[@client:DeviceFormDialogClient:createDevice] Failed to create device:',
          result.error,
        );
        setCreateError(result.error || 'Failed to create device');
      }
    } catch (error) {
      console.error('[@client:DeviceFormDialogClient:createDevice] Error creating device:', error);
      setCreateError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  // Device type options with proper categorization
  const deviceTypeOptions = [
    { value: 'linux', label: 'Linux Device' },
    { value: 'windows', label: 'Windows Device' },
    { value: 'android_phone', label: 'Android Phone' },
    { value: 'android_tablet', label: 'Android Tablet' },
    { value: 'android_tv', label: 'Android TV' },
    { value: 'android_firetv', label: 'Android FireTV' },
    { value: 'android_nvidia_shield', label: 'Android Nvidia Shield' },
    { value: 'ios_phone', label: 'iPhone' },
    { value: 'ios_tablet', label: 'iPad' },
    { value: 'tv_tizen', label: 'Samsung TV (Tizen)' },
    { value: 'tv_lg', label: 'LG TV (webOS)' },
    { value: 'appletv', label: 'Apple TV' },
    { value: 'stb_eos', label: 'Set-Top Box (EOS)' },
    { value: 'stb_apollo', label: 'Set-Top Box (Apollo)' },
  ];

  // Check if form is valid
  const isAndroidDevice = formData.device_type.includes('android');
  const requiresAdbHost = isAndroidDevice;

  const isFormValid =
    formData.name.trim() &&
    formData.ip.trim() &&
    formData.ip_local.trim() &&
    formData.device_type &&
    (!requiresAdbHost || formData.host_id); // Require host_id for Android devices

  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="device-name" className="text-right">
          Device Name
        </Label>
        <div className="col-span-3">
          <Input
            id="device-name"
            placeholder="Enter device name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="device-type" className="text-right">
          Device Type
        </Label>
        <div className="col-span-3">
          <Select value={formData.device_type} onValueChange={handleDeviceTypeChange}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select device type" />
            </SelectTrigger>
            <SelectContent>
              {deviceTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="public-ip" className="text-right">
          Public IP
        </Label>
        <div className="col-span-3">
          <Input
            id="public-ip"
            placeholder="Public/Gateway IP address"
            value={formData.ip}
            onChange={(e) => handleInputChange('ip', e.target.value)}
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="local-ip" className="text-right">
          Local IP
        </Label>
        <div className="col-span-3">
          <Input
            id="local-ip"
            placeholder="Local/Private IP address"
            value={formData.ip_local}
            onChange={(e) => handleInputChange('ip_local', e.target.value)}
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="device-description" className="text-right">
          Description
        </Label>
        <div className="col-span-3">
          <Textarea
            id="device-description"
            placeholder="Optional device description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="min-h-[60px] py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="host-id" className="text-right">
          ADB Host
        </Label>
        <div className="col-span-3">
          <Select value={formData.host_id} onValueChange={handleHostChange}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select host with ADB" />
            </SelectTrigger>
            <SelectContent>
              {sshHosts.map((host) => (
                <SelectItem key={host.id} value={host.id}>
                  <div className="flex items-center gap-2">
                    <span>🖥️</span>
                    {host.name} ({host.ip})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sshHosts.length === 0 && (
            <p className="text-xs text-orange-600 mt-1">
              No connected SSH hosts available. Add an SSH host first.
            </p>
          )}
        </div>
      </div>

      {/* Error display */}
      {createError && (
        <div className="col-span-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          Error: {createError}
        </div>
      )}

      <div className="flex justify-end space-x-3 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isCreating}
          className="h-8 px-3 text-sm"
        >
          {c('cancel')}
        </Button>

        <Button
          type="button"
          onClick={createDevice}
          disabled={isCreating || !isFormValid}
          className="h-8 px-3 text-sm bg-blue-600 hover:bg-blue-700"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            <>
              <Check className="h-3 w-3 mr-2" />
              Add Device
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
