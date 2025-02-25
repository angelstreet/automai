'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOCK_DEVICES } from '@/constants/virtualization';
import { Download, RefreshCcw } from 'lucide-react';

const MOCK_METRICS = {
  cpu: [
    { timestamp: '2024-03-20T10:00:00Z', value: 45 },
    { timestamp: '2024-03-20T10:05:00Z', value: 62 },
    { timestamp: '2024-03-20T10:10:00Z', value: 58 },
    { timestamp: '2024-03-20T10:15:00Z', value: 75 },
  ],
  memory: [
    { timestamp: '2024-03-20T10:00:00Z', value: 3.2 },
    { timestamp: '2024-03-20T10:05:00Z', value: 3.8 },
    { timestamp: '2024-03-20T10:10:00Z', value: 4.1 },
    { timestamp: '2024-03-20T10:15:00Z', value: 3.9 },
  ],
  network: [
    { timestamp: '2024-03-20T10:00:00Z', in: 150, out: 80 },
    { timestamp: '2024-03-20T10:05:00Z', in: 220, out: 120 },
    { timestamp: '2024-03-20T10:10:00Z', in: 180, out: 90 },
    { timestamp: '2024-03-20T10:15:00Z', in: 250, out: 140 },
  ],
};

export default function VirtualizationAnalyticsPage() {
  const t = useTranslations('Common');
  const params = useParams();
  const tenant = params.tenant as string;

  const [selectedDevice, setSelectedDevice] = useState<string>(MOCK_DEVICES[0].id);
  const [timeRange, setTimeRange] = useState('1h');
  const [metrics] = useState(MOCK_METRICS);

  const device = MOCK_DEVICES.find(d => d.id === selectedDevice);

  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <Select value={selectedDevice} onValueChange={setSelectedDevice}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select device" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_DEVICES.map(device => (
              <SelectItem key={device.id} value={device.id}>
                {device.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="6h">Last 6 Hours</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              CPU Chart Placeholder
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Memory Chart Placeholder
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network Traffic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Network Chart Placeholder
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Device Name</p>
                  <p className="font-medium">{device?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{device?.statusLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Connection Type</p>
                  <p className="font-medium">{device?.connectionType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Containers</p>
                  <p className="font-medium">{device?.containers.total}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <div className="space-y-2">
                  {device?.alerts.map((alert, index) => (
                    <p key={index} className="text-sm text-yellow-500">
                      • {alert}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 