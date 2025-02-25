import { useState } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ConnectionForm, FormData } from './ConnectionForm';

interface ConnectMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (machine: Machine) => void;
}

export function ConnectMachineDialog({ open, onOpenChange, onSuccess }: ConnectMachineDialogProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
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

  const handleFormChange = (newFormData: FormData) => {
    setFormData(newFormData);
    if (testStatus !== 'idle') {
      setTestStatus('idle');
      setTestError(null);
    }
  };

  const isFormValid = () => {
    if (!formData.name.trim() || !formData.ip.trim()) return false;
    
    if (formData.type === 'ssh' && (!formData.user.trim() || !formData.password.trim())) {
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
            Connect the remote machine or container
          </DialogDescription>
        </DialogHeader>
        
        <ConnectionForm 
          formData={formData} 
          onChange={handleFormChange}
          testStatus={testStatus}
          testError={testError}
        />
        
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