'use client';

import { FolderPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { HostsEvents } from '@/app/[locale]/[tenant]/hosts/_components/client/HostEventListener';
import { RepositoryEvents } from '@/app/[locale]/[tenant]/repositories/_components/client/RepositoryEventListener';
import { DeploymentEvents } from '@/app/[locale]/[tenant]/deployment/_components/client/DeploymentEventListener';
import {
  getWorkspaces,
  getWorkspacesContainingItem,
  addItemToWorkspace,
  removeItemFromWorkspace,
} from '@/app/actions/workspaceAction';
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
import { Workspace } from '@/types/component/workspaceComponentType';

// Cache for workspaces data
interface WorkspaceCache {
  workspaces: Workspace[] | null;
  timestamp: number;
}

// Global cache with 60 second TTL
const CACHE_TTL = 60 * 1000; // 60 seconds
let globalWorkspaceCache: WorkspaceCache = {
  workspaces: null,
  timestamp: 0,
};

interface AddToWorkspaceProps {
  itemType: 'deployment' | 'repository' | 'host' | 'config';
  itemId: string;
  trigger?: React.ReactNode;
  onClose?: () => void;
}

export default function AddToWorkspace({
  itemType,
  itemId,
  trigger,
  onClose,
}: AddToWorkspaceProps) {
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
          // Check if we have cached workspaces data that's still valid
          const now = Date.now();
          let workspacesResult;

          if (globalWorkspaceCache.workspaces && now - globalWorkspaceCache.timestamp < CACHE_TTL) {
            console.log('[@component:AddToWorkspace] Using cached workspaces data');
            workspacesResult = { success: true, data: globalWorkspaceCache.workspaces };
          } else {
            console.log('[@component:AddToWorkspace] Fetching fresh workspaces data');
            // Get workspaces and save to cache
            workspacesResult = await getWorkspaces();
            if (workspacesResult.success && workspacesResult.data) {
              globalWorkspaceCache = {
                workspaces: workspacesResult.data,
                timestamp: now,
              };
            }
          }

          // Get memberships
          const membershipResult = await getWorkspacesContainingItem(itemType, itemId);

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

  // Immediately update UI when toggling a workspace
  const toggleWorkspace = (workspaceId: string) => {
    setSelectedWorkspaces((prev) => ({
      ...prev,
      [workspaceId]: !prev[workspaceId],
    }));
  };

  // Get the appropriate event constant based on item type
  const getItemTypeEvents = () => {
    switch (itemType) {
      case 'repository':
        return RepositoryEvents;
      case 'host':
        return HostsEvents;
      case 'deployment':
        return DeploymentEvents;
      default:
        return null;
    }
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

      // Dispatch events to notify components that workspaces have changed for this item
      const events = getItemTypeEvents();
      if (events) {
        window.dispatchEvent(
          new CustomEvent(events.WORKSPACE_ITEM_ADDED, {
            detail: { itemId, itemType },
          }),
        );
      }

      // Close the dialog
      setIsOpen(false);

      // Close parent dropdown if callback provided
      if (onClose) {
        onClose();
      }
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open && onClose) {
          onClose();
        }
      }}
    >
      <DialogTrigger asChild>
        <span onClick={stopPropagation}>
          {trigger || (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <FolderPlus className="mr-2 h-3.5 w-3.5" />
              Workspaces
            </Button>
          )}
        </span>
      </DialogTrigger>

      <DialogContent onClick={stopPropagation} className="w-[380px]">
        <DialogHeader>
          <DialogTitle>Workspaces</DialogTitle>
          <DialogDescription>Select workspaces for this {itemType}.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading workspaces...</div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-4">No workspaces found. Create a workspace first.</div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto pr-2">
              {workspaces.map((workspace) => {
                const isSelected = !!selectedWorkspaces[workspace.id];

                return (
                  <button
                    key={workspace.id}
                    type="button"
                    className="flex items-center w-full text-left p-1.5 rounded hover:bg-secondary/20 focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWorkspace(workspace.id);
                    }}
                  >
                    <div className="flex items-center justify-center h-4 w-4 rounded border border-primary mr-2 flex-shrink-0">
                      {isSelected && <div className="h-2 w-2 bg-primary rounded-sm" />}
                    </div>

                    <div className="flex-1 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {workspace.name}
                        {memberWorkspaces.includes(workspace.id) && (
                          <span className="text-xs text-muted-foreground">(Current)</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
