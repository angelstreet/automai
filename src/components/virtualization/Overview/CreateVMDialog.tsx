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
  const [newVMConfig, setNewVMConfig] = useState({
    name: '',
    description: '',
    type: 'vm',
    image: '',
    cpu: '1',
    memory: '1024',
  });

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // This would be replaced with actual API call
      console.log('Creating new VM configuration:', newVMConfig);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form and close dialog
      setNewVMConfig({
        name: '',
        description: '',
        type: 'vm',
        image: '',
        cpu: '1',
        memory: '1024',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating VM configuration:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>New</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create VM Configuration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Configuration name"
              value={newVMConfig.name}
              onChange={(e) => setNewVMConfig({ ...newVMConfig, name: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select 
              value={newVMConfig.type} 
              onValueChange={(value) => setNewVMConfig({ ...newVMConfig, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vm">Virtual Machine</SelectItem>
                <SelectItem value="docker">Docker Container</SelectItem>
                <SelectItem value="portainer">Portainer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Image/OS</Label>
            <Input
              id="image"
              placeholder="Image or OS name"
              value={newVMConfig.image}
              onChange={(e) => setNewVMConfig({ ...newVMConfig, image: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpu">CPU Cores</Label>
              <Input
                id="cpu"
                type="number"
                min="1"
                value={newVMConfig.cpu}
                onChange={(e) => setNewVMConfig({ ...newVMConfig, cpu: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memory">Memory (MB)</Label>
              <Input
                id="memory"
                type="number"
                min="512"
                step="512"
                value={newVMConfig.memory}
                onChange={(e) => setNewVMConfig({ ...newVMConfig, memory: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description (optional)"
              value={newVMConfig.description}
              onChange={(e) => setNewVMConfig({ ...newVMConfig, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            type="button"
            disabled={!newVMConfig.name.trim() || !newVMConfig.image.trim() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 