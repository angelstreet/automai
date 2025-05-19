'use client';

import { FolderPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  getWorkspaces,
  getWorkspacesContainingItem,
  addItemToWorkspace,
  removeItemFromWorkspace,
} from '@/app/actions/workspaceAction';
import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog';
import { Workspace } from '@/types/component/workspaceComponentType';

interface AddToWorkspaceProps {
  itemType: 'deployment' | 'repository' | 'host' | 'config';
  itemId: string;
  trigger?: React.ReactNode;
}

export default function AddToWorkspace({ itemType, itemId, trigger }: AddToWorkspaceProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [memberWorkspaces, setMemberWorkspaces] = useState<string[]>([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspaces and membership when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // Get all workspaces and memberships in parallel
          const [workspacesResult, membershipResult] = await Promise.all([
            getWorkspaces(),
            getWorkspacesContainingItem(itemType, itemId),
          ]);

          if (workspacesResult.success && workspacesResult.data) {
            setWorkspaces(workspacesResult.data);
          }

          if (membershipResult.success && membershipResult.data) {
            setMemberWorkspaces(membershipResult.data);

            // Initialize selected workspaces based on current memberships
            const selected: Record<string, boolean> = {};
            membershipResult.data.forEach((id) => {
              selected[id] = true;
            });
            setSelectedWorkspaces(selected);
          }
        } catch (err) {
          console.error('[@component:AddToWorkspace] Error fetching data:', err);
          setError('Failed to load workspaces');
        }
        setIsLoading(false);
      };

      fetchData();
    }
  }, [isOpen, itemId, itemType]);

  const toggleWorkspace = (workspaceId: string) => {
    setSelectedWorkspaces((prev) => ({
      ...prev,
      [workspaceId]: !prev[workspaceId],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const operations = [];

      // For each workspace, check if we need to add or remove
      for (const workspace of workspaces) {
        const isSelected = !!selectedWorkspaces[workspace.id];
        const isMember = memberWorkspaces.includes(workspace.id);

        if (isSelected && !isMember) {
          // Add to workspace
          operations.push(addItemToWorkspace(workspace.id, itemType, itemId));
        } else if (!isSelected && isMember) {
          // Remove from workspace
          operations.push(removeItemFromWorkspace(workspace.id, itemType, itemId));
        }
      }

      // Execute all operations
      await Promise.all(operations);
      setIsOpen(false);
    } catch (err) {
      console.error('[@component:AddToWorkspace] Error saving workspace changes:', err);
      setError('Failed to update workspaces');
    }

    setIsSaving(false);
  };

  // Stop event propagation to prevent parent table row click
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <span onClick={stopPropagation}>
          {trigger || (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <FolderPlus className="mr-2 h-3.5 w-3.5" />
              Manage in Workspaces
            </Button>
          )}
        </span>
      </DialogTrigger>

      <DialogContent onClick={stopPropagation} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage in Workspaces</DialogTitle>
          <DialogDescription>
            Select workspaces to add or remove this {itemType} from.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading workspaces...</div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-4">No workspaces found. Create a workspace first.</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="flex items-center space-x-2 p-2 rounded hover:bg-secondary/20"
                  onClick={() => toggleWorkspace(workspace.id)}
                >
                  <Checkbox
                    checked={!!selectedWorkspaces[workspace.id]}
                    onCheckedChange={() => toggleWorkspace(workspace.id)}
                    id={`workspace-${workspace.id}`}
                  />
                  <label
                    htmlFor={`workspace-${workspace.id}`}
                    className="flex-1 text-sm font-medium leading-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {workspace.name}
                      {memberWorkspaces.includes(workspace.id) && (
                        <span className="text-xs text-muted-foreground">(Current)</span>
                      )}
                    </div>
                    {workspace.description && (
                      <p className="text-xs text-muted-foreground mt-1">{workspace.description}</p>
                    )}
                  </label>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
