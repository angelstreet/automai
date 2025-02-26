import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Machine } from '@/types/virtualization';
import { Loader2 } from 'lucide-react';
import { ConnectionForm, FormData } from './ConnectionForm';

interface ConnectHostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (machine: Machine) => void;
}

export function ConnectHostDialog({ open, onOpenChange, onSuccess }: ConnectHostDialogProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const lastRequestTime = useRef<number>(0);
  const REQUEST_THROTTLE_MS = 500; // minimum time between requests
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      type: 'ssh',
      ip: '',
      port: '22',
      username: '',
      password: '',
    });
    setTestStatus('idle');
    setTestError(null);
  }, []);

  const validateFormData = (): boolean => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please provide a name for the connection',
      });
      return false;
    }

    if (!formData.ip.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please provide an IP address',
      });
      return false;
    }

    const port = parseInt(formData.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Port must be a number between 1 and 65535',
      });
      return false;
    }

    if (formData.type === 'ssh' && (!formData.username.trim() || !formData.password.trim())) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Username and password are required for SSH connections',
      });
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateFormData()) return;
    
    // Throttle requests
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS) {
      return;
    }
    lastRequestTime.current = now;

    setIsCreating(true);
    try {
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
          username: formData.username,
          password: formData.password,
          status: 'connected',
          lastConnected: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create connection');
      }

      const data = await response.json();

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

  const getDetailedErrorMessage = (errorData: any): string => {
    if (!errorData) return 'Unknown error occurred';
    
    if (errorData.message) {
      const message = errorData.message;
      
      if (message.includes('timeout')) {
        return `Connection timed out. Please check if the IP address and port are correct and that any firewalls allow the connection.`;
      }
      
      if (message.includes('refused')) {
        return `Connection refused. Please check if the service is running on the target machine and the port is correct.`;
      }
      
      if (message.includes('authentication') || message.includes('password')) {
        return `Authentication failed. Please check your username and password.`;
      }
      
      return message;
    }
    
    return 'Failed to connect to the remote machine. Please check your connection details.';
  };

  const testConnection = async (): Promise<boolean> => {
    if (!validateFormData()) return false;
    
    // Throttle requests
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE_MS) {
      return false;
    }
    lastRequestTime.current = now;

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
          username: formData.username,
          password: formData.password,
          machineId: formData.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setTestStatus('error');
        const errorMessage = getDetailedErrorMessage(data);
        setTestError(errorMessage || 'Connection test failed');
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

  const handleFormChange = (newFormData: FormData) => {
    setFormData(newFormData);
    if (testStatus !== 'idle') {
      setTestStatus('idle');
      setTestError(null);
    }
  };

  const isFormValid = (): boolean => {
    if (!formData.name.trim() || !formData.ip.trim()) return false;
    
    if (formData.type === 'ssh' && (!formData.username.trim() || !formData.password.trim())) {
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect to client</DialogTitle>
          <DialogDescription>
            Connect to a remote machine or container for management
          </DialogDescription>
        </DialogHeader>
        
        <ConnectionForm 
          formData={formData} 
          onChange={handleFormChange}
          onSave={handleCreate}
          onTestSuccess={() => setTestStatus('success')}
        />
      </DialogContent>
    </Dialog>
  );
} 