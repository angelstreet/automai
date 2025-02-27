'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Switch } from '@/components/shadcn/switch';
import { useToast } from '@/components/shadcn/use-toast';

export default function HostsSettingsPage() {
  const t = useTranslations('Common');
  const params = useParams();
  const tenant = params.tenant as string;
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    defaultCPU: '2',
    defaultMemory: '2048',
    defaultDisk: '20',
    autoStart: true,
    networkType: 'bridge',
    maxContainers: '10',
    backupEnabled: true,
    backupInterval: '24',
    monitoringEnabled: true,
    alertThreshold: '80',
  });

  const handleSave = async () => {
    try {
      console.log('Saving settings:', settings);

      toast({
        title: 'Settings saved',
        description: 'Your host settings have been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Host Settings</h1>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default Host Configuration</CardTitle>
            <CardDescription>Set default values for new hosts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultCPU">Default CPU Cores</Label>
              <Input
                id="defaultCPU"
                type="number"
                min="1"
                value={settings.defaultCPU}
                onChange={(e) => setSettings({ ...settings, defaultCPU: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultMemory">Default Memory (MB)</Label>
              <Input
                id="defaultMemory"
                type="number"
                min="512"
                step="512"
                value={settings.defaultMemory}
                onChange={(e) => setSettings({ ...settings, defaultMemory: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDisk">Default Disk Size (GB)</Label>
              <Input
                id="defaultDisk"
                type="number"
                min="5"
                value={settings.defaultDisk}
                onChange={(e) => setSettings({ ...settings, defaultDisk: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network Settings</CardTitle>
            <CardDescription>Configure network options for virtual machines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="networkType">Network Type</Label>
              <Select
                value={settings.networkType}
                onValueChange={(value) => setSettings({ ...settings, networkType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select network type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bridge">Bridge</SelectItem>
                  <SelectItem value="nat">NAT</SelectItem>
                  <SelectItem value="host">Host-only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxContainers">Max Containers per Host</Label>
              <Input
                id="maxContainers"
                type="number"
                min="1"
                value={settings.maxContainers}
                onChange={(e) => setSettings({ ...settings, maxContainers: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoStart">Auto-start VMs on Host Boot</Label>
              <Switch
                id="autoStart"
                checked={settings.autoStart}
                onCheckedChange={(checked) => setSettings({ ...settings, autoStart: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backup Settings</CardTitle>
            <CardDescription>Configure automated backup options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="backupEnabled">Enable Automated Backups</Label>
              <Switch
                id="backupEnabled"
                checked={settings.backupEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, backupEnabled: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backupInterval">Backup Interval (hours)</Label>
              <Input
                id="backupInterval"
                type="number"
                min="1"
                value={settings.backupInterval}
                onChange={(e) => setSettings({ ...settings, backupInterval: e.target.value })}
                disabled={!settings.backupEnabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monitoring & Alerts</CardTitle>
            <CardDescription>Configure monitoring and alert thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="monitoringEnabled">Enable Resource Monitoring</Label>
              <Switch
                id="monitoringEnabled"
                checked={settings.monitoringEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, monitoringEnabled: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alertThreshold">Resource Alert Threshold (%)</Label>
              <Input
                id="alertThreshold"
                type="number"
                min="1"
                max="100"
                value={settings.alertThreshold}
                onChange={(e) => setSettings({ ...settings, alertThreshold: e.target.value })}
                disabled={!settings.monitoringEnabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
