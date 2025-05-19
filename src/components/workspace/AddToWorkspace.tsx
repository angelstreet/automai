'use client';

import { FolderPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getWorkspaces } from '@/app/actions/workspaceAction';
import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Workspace } from '@/types/component/workspaceComponentType';

interface AddToWorkspaceProps {
  itemId: string;
  itemType: 'deployment' | 'repository' | 'host' | 'config'; // Add more types as needed
  onAddToWorkspace: (workspaceId: string) => Promise<void>;
  trigger?: React.ReactNode; // Optional custom trigger
}

export default function AddToWorkspace({
  itemId,
  itemType,
  onAddToWorkspace,
  trigger,
}: AddToWorkspaceProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      setIsLoading(true);
      try {
        const result = await getWorkspaces();
        if (result.success && result.data) {
          setWorkspaces(result.data);
        }
      } catch (err) {
        console.error('[@component:AddToWorkspace] Error fetching workspaces:', err);
        setError('Failed to load workspaces');
      }
      setIsLoading(false);
    };

    if (isOpen) {
      fetchWorkspaces();
    }
  }, [isOpen]);

  const handleAdd = async () => {
    if (!selectedWorkspace) {
      setError('Please select a workspace');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await onAddToWorkspace(selectedWorkspace);
      setIsOpen(false);
      setSelectedWorkspace('');
    } catch (err) {
      console.error('[@component:AddToWorkspace] Error adding to workspace:', err);
      setError('Failed to add to workspace');
    }
    setIsLoading(false);
  };

  // Stop event propagation to prevent parent table row click
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Custom trigger wrapper with stopPropagation
  const triggerWithStopPropagation = (
    <span onClick={stopPropagation}>
      {trigger || (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <FolderPlus className="mr-2 h-3.5 w-3.5" />
          Add to Workspace
        </Button>
      )}
    </span>
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isLoading) {
          setIsOpen(open);
        }
      }}
    >
      <DialogTrigger asChild>{triggerWithStopPropagation}</DialogTrigger>
      <DialogContent
        onPointerDownCapture={stopPropagation}
        onClick={stopPropagation}
        className="z-50"
      >
        <DialogHeader>
          <DialogTitle>Add to Workspace</DialogTitle>
          <DialogDescription>Select a workspace to add this {itemType} to.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4" onClick={stopPropagation}>
          <Select
            value={selectedWorkspace}
            onValueChange={setSelectedWorkspace}
            disabled={isLoading}
          >
            <SelectTrigger onClick={stopPropagation}>
              <SelectValue placeholder="Select a workspace" />
            </SelectTrigger>
            <SelectContent
              onPointerDownCapture={stopPropagation}
              onClick={stopPropagation}
              onSelect={stopPropagation}
              position="popper"
              className="z-[60]"
            >
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id} onClick={stopPropagation}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={(e) => {
              stopPropagation(e);
              setIsOpen(false);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={(e) => {
              stopPropagation(e);
              handleAdd();
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
