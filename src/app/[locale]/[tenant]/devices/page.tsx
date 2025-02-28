'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { Label } from '@/components/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DevicesPage() {
  const t = useTranslations('Common');
  const params = useParams();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [newDevice, setNewDevice] = useState({
    name: '',
    description: '',
    type: 'web', // web or mobile
    platform: 'chrome', // chrome, firefox, safari, android, ios
    version: '',
    resolution: '1920x1080',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // This would be replaced with actual API call
      console.log('Creating new device:', newDevice);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reset form and close dialog
      setNewDevice({
        name: '',
        description: '',
        type: 'web',
        platform: 'chrome',
        version: '',
        resolution: '1920x1080',
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating device:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 space-y-4">
      {/* Title section with buttons */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
        <div className="flex gap-2">
          {isSelectionMode ? (
            <>
              {selectedItems.size > 0 && (
                <Button variant="destructive" size="sm">
                  Delete ({selectedItems.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedItems(new Set());
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}>
              Select
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Device name"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newDevice.type}
                    onValueChange={(value) => {
                      const platform = value === 'web' ? 'chrome' : 'android';
                      setNewDevice({ ...newDevice, type: value, platform });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web Browser</SelectItem>
                      <SelectItem value="mobile">Mobile Device</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={newDevice.platform}
                    onValueChange={(value) => setNewDevice({ ...newDevice, platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {newDevice.type === 'web' ? (
                        <>
                          <SelectItem value="chrome">Chrome</SelectItem>
                          <SelectItem value="firefox">Firefox</SelectItem>
                          <SelectItem value="safari">Safari</SelectItem>
                          <SelectItem value="edge">Edge</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="android">Android</SelectItem>
                          <SelectItem value="ios">iOS</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    placeholder="Version number"
                    value={newDevice.version}
                    onChange={(e) => setNewDevice({ ...newDevice, version: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resolution">Resolution</Label>
                  <Input
                    id="resolution"
                    placeholder="e.g. 1920x1080"
                    value={newDevice.resolution}
                    onChange={(e) => setNewDevice({ ...newDevice, resolution: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Description (optional)"
                    value={newDevice.description}
                    onChange={(e) => setNewDevice({ ...newDevice, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  type="button"
                  disabled={!newDevice.name.trim() || !newDevice.version.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Devices Management</CardTitle>
          <CardDescription>Manage your testing devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-60">
            <p className="text-sm text-muted-foreground">
              Device management content will be available soon
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
