import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Machine } from '@/types/virtualization';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ConnectMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (machine: Machine) => void;
}

export function ConnectMachineDialog({ open, onOpenChange, onSuccess }: ConnectMachineDialogProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionType, setConnectionType] = useState<'ssh' | 'docker' | 'portainer'>('ssh');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    user: '',
    password: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'ssh',
      ip: '',
      port: '22',
      user: '',
      password: '',
    });
    setTestStatus('idle');
    setTestError(null);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // First test the connection
      await testConnection();

      if (testStatus === 'error') {
        throw new Error('Connection test failed');
      }

      // Create the connection
      const response = await fetch('/api/virtualization/machines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          ip: formData.ip,
          port: formData.port ? parseInt(formData.port) : undefined,
          user: formData.user,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create connection');
      }

      toast({
        title: 'Connection created',
        description: `Successfully connected to ${formData.name}`,
      });

      resetForm();
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess(data.data);
      }
    } catch (error) {
      console.error('Error creating connection:', error);
      toast({
        variant: 'destructive',
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to create connection',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestStatus('idle');
    setTestError(null);
    
    try {
      const response = await fetch('/api/virtualization/machines/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          ip: formData.ip,
          port: formData.port ? parseInt(formData.port) : undefined,
          user: formData.user,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setTestStatus('error');
        setTestError(data.message || 'Connection test failed');
        return false;
      }

      setTestStatus('success');
      return true;
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestStatus('error');
      setTestError(error instanceof Error ? error.message : 'Connection test failed');
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleTypeChange = (value: string) => {
    setConnectionType(value as 'ssh' | 'docker' | 'portainer');
    setFormData({ 
      ...formData, 
      type: value,
      port: value === 'ssh' ? '22' : value === 'docker' ? '2375' : '9000'
    });
    setTestStatus('idle');
    setTestError(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (testStatus !== 'idle') {
      setTestStatus('idle');
      setTestError(null);
    }
  };

  const isFormValid = () => {
    if (!formData.name.trim() || !formData.ip.trim()) return false;
    
    if (connectionType === 'ssh' && (!formData.user.trim() || !formData.password.trim())) {
      return false;
    }
    
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect to client</DialogTitle>
          <DialogDescription>
            Connect to a remote machine or container host
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Client name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Connection Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ssh">SSH</SelectItem>
                <SelectItem value="docker">Docker</SelectItem>
                <SelectItem value="portainer">Portainer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="ip">IP Address</Label>
              <Input
                id="ip"
                placeholder="IP Address"
                value={formData.ip}
                onChange={(e) => handleInputChange('ip', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                placeholder="Port"
                value={formData.port}
                onChange={(e) => handleInputChange('port', e.target.value)}
              />
            </div>
          </div>
          
          {connectionType === 'ssh' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="user">Username</Label>
                <Input
                  id="user"
                  placeholder="Username"
                  value={formData.user}
                  onChange={(e) => handleInputChange('user', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>
          
          {testStatus === 'success' && (
            <Alert className="bg-green-50 text-green-800 border-green-100">
              <AlertTitle>Connection successful</AlertTitle>
              <AlertDescription>
                Successfully connected to the remote machine.
              </AlertDescription>
            </Alert>
          )}

          {testStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection failed</AlertTitle>
              <AlertDescription>
                {testError || "Couldn't connect to the remote machine."}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={testConnection}
            type="button"
            variant="outline"
            disabled={!isFormValid() || isTesting}
            className="w-full sm:w-auto"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : 'Test Connection'}
          </Button>
          
          <Button
            onClick={handleCreate}
            type="button"
            disabled={!isFormValid() || isCreating}
            className="w-full sm:w-auto"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 