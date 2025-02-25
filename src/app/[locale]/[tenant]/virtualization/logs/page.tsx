'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MOCK_DEVICES } from '@/constants/virtualization';
import { Search, Download, RefreshCcw } from 'lucide-react';

const MOCK_LOGS = [
  { id: '1', deviceId: MOCK_DEVICES[0].id, timestamp: '2024-03-20T10:00:00Z', level: 'info', message: 'Container started successfully' },
  { id: '2', deviceId: MOCK_DEVICES[0].id, timestamp: '2024-03-20T10:01:00Z', level: 'warning', message: 'High memory usage detected' },
  { id: '3', deviceId: MOCK_DEVICES[1].id, timestamp: '2024-03-20T10:02:00Z', level: 'error', message: 'Failed to connect to network' },
  // Add more mock logs as needed
];

const LOG_LEVELS = {
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function VirtualizationLogsPage() {
  const t = useTranslations('Common');
  const params = useParams();
  const tenant = params.tenant as string;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [logs] = useState(MOCK_LOGS);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDevice = selectedDevice === 'all' || log.deviceId === selectedDevice;
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    return matchesSearch && matchesDevice && matchesLevel;
  });

  const handleExport = () => {
    const exportData = filteredLogs.map(log => ({
      timestamp: log.timestamp,
      device: MOCK_DEVICES.find(d => d.id === log.deviceId)?.name || 'Unknown',
      level: log.level,
      message: log.message,
    }));
    
    const csvContent = [
      ['Timestamp', 'Device', 'Level', 'Message'].join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `virtualization-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">System Logs</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {MOCK_DEVICES.map(device => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[calc(100vh-300px)] w-full rounded-md border">
            <div className="space-y-2 p-4">
              {filteredLogs.map(log => {
                const device = MOCK_DEVICES.find(d => d.id === log.deviceId);
                return (
                  <div
                    key={log.id}
                    className="flex items-start space-x-4 rounded-lg border p-3"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="font-medium">
                          {device?.name || 'Unknown Device'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={LOG_LEVELS[log.level as keyof typeof LOG_LEVELS]}
                        >
                          {log.level}
                        </Badge>
                      </div>
                      <p className="text-sm">{log.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 