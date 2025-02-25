import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateVMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateVMDialog({ open, onOpenChange }: CreateVMDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [connectionType, setConnectionType] = useState('ssh');
  const [newClientConfig, setNewClientConfig] = useState({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    user: '',
    password: '',
  });

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // This would be replaced with actual API call
      console.log('Creating new client connection:', newClientConfig);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form and close dialog
      setNewClientConfig({
        name: '',
        description: '',
        type: 'ssh',
        ip: '',
        user: '',
        password: '',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating client connection:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTypeChange = (value: string) => {
    setConnectionType(value);
    setNewClientConfig({ ...newClientConfig, type: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>New</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect to client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Client name"
              value={newClientConfig.name}
              onChange={(e) => setNewClientConfig({ ...newClientConfig, name: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Connection Type</Label>
            <Select 
              value={newClientConfig.type} 
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
          
          <div className="space-y-2">
            <Label htmlFor="ip">IP Address</Label>
            <Input
              id="ip"
              placeholder="IP Address"
              value={newClientConfig.ip}
              onChange={(e) => setNewClientConfig({ ...newClientConfig, ip: e.target.value })}
            />
          </div>
          
          {connectionType === 'ssh' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="user">Username</Label>
                <Input
                  id="user"
                  placeholder="Username"
                  value={newClientConfig.user}
                  onChange={(e) => setNewClientConfig({ ...newClientConfig, user: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={newClientConfig.password}
                  onChange={(e) => setNewClientConfig({ ...newClientConfig, password: e.target.value })}
                />
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description (optional)"
              value={newClientConfig.description}
              onChange={(e) => setNewClientConfig({ ...newClientConfig, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            type="button"
            disabled={!newClientConfig.name.trim() || !newClientConfig.ip.trim() || 
              (connectionType === 'ssh' && (!newClientConfig.user.trim() || !newClientConfig.password.trim())) ||
              isCreating}
          >
            {isCreating ? 'Connecting...' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 