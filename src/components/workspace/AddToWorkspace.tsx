'use client';

import { FolderPlus } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import {
  getWorkspaces,
  getWorkspacesContainingItem,
  addItemToWorkspace,
  removeItemFromWorkspace,
} from '@/app/actions/workspaceAction';
import { DeploymentEvents } from '@/app/[locale]/[tenant]/deployment/_components/client/DeploymentEventListener';
import { HostsEvents } from '@/app/[locale]/[tenant]/hosts/_components/client/HostEventListener';
import { RepositoryEvents } from '@/app/[locale]/[tenant]/repositories/_components/client/RepositoryEventListener';
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
  membershipCache: Map<string, { data: string[]; timestamp: number }>;
}

// Global cache with 60 second TTL
const CACHE_TTL = 60 * 1000; // 60 seconds
const globalWorkspaceCache: WorkspaceCache = {
  workspaces: null,
  timestamp: 0,
  membershipCache: new Map(),
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
  const [isCachedData, setIsCachedData] = useState(false);

  // Pre-fetch workspaces on mount to have them ready when dialog opens
  useEffect(() => {
    const prefetchWorkspaces = async () => {
      const now = Date.now();
      if (!globalWorkspaceCache.workspaces || now - globalWorkspaceCache.timestamp > CACHE_TTL) {
        try {
          console.log('[@component:AddToWorkspace] Pre-fetching workspaces in background');
          const workspacesResult = await getWorkspaces();
          if (workspacesResult.success && workspacesResult.data) {
            globalWorkspaceCache.workspaces = workspacesResult.data;
            globalWorkspaceCache.timestamp = now;
            console.log('[@component:AddToWorkspace] Successfully pre-fetched workspaces');
          }
        } catch (err) {
          console.error('[@component:AddToWorkspace] Error pre-fetching workspaces:', err);
        }
      }
    };

    prefetchWorkspaces();
  }, []);

  // Get workspaces from cache or fetch them
  const fetchWorkspaces = useCallback(async () => {
    const now = Date.now();

    // Try to use cached workspaces
    if (globalWorkspaceCache.workspaces && now - globalWorkspaceCache.timestamp < CACHE_TTL) {
      console.log('[@component:AddToWorkspace] Using cached workspaces');
      setWorkspaces(globalWorkspaceCache.workspaces);
      setIsCachedData(true);
      return globalWorkspaceCache.workspaces;
    }

    // Fetch fresh workspaces
    console.log('[@component:AddToWorkspace] Fetching fresh workspaces');
    try {
      const workspacesResult = await getWorkspaces();
      if (workspacesResult.success && workspacesResult.data) {
        globalWorkspaceCache.workspaces = workspacesResult.data;
        globalWorkspaceCache.timestamp = now;
        setWorkspaces(workspacesResult.data);
        return workspacesResult.data;
      }
    } catch (err) {
      console.error('[@component:AddToWorkspace] Error fetching workspaces:', err);
    }
    return [];
  }, []);

  // Get membership from cache or fetch it
  const fetchMembership = useCallback(async () => {
    const now = Date.now();
    const membershipCacheKey = `${itemType}-${itemId}`;
    const cachedMembership = globalWorkspaceCache.membershipCache.get(membershipCacheKey);

    // Try to use cached membership
    if (cachedMembership && now - cachedMembership.timestamp < CACHE_TTL) {
      console.log('[@component:AddToWorkspace] Using cached membership');
      setMemberWorkspaces(cachedMembership.data);
      return cachedMembership.data;
    }

    // Fetch fresh membership
    console.log('[@component:AddToWorkspace] Fetching fresh membership');
    try {
      const membershipResult = await getWorkspacesContainingItem(itemType, itemId);
      if (membershipResult.success && membershipResult.data) {
        const data = membershipResult.data;
        globalWorkspaceCache.membershipCache.set(membershipCacheKey, {
          data,
          timestamp: now,
        });
        setMemberWorkspaces(data);
        return data;
      }
    } catch (err) {
      console.error('[@component:AddToWorkspace] Error fetching membership:', err);
    }
    return [];
  }, [itemId, itemType]);

  // Fetch workspaces and membership when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setError(null);

        // If we don't already have cached data, show loading state
        if (
          !isCachedData &&
          (!globalWorkspaceCache.workspaces ||
            Date.now() - globalWorkspaceCache.timestamp > CACHE_TTL)
        ) {
          setIsLoading(true);
        }

        try {
          // Get workspaces and memberships concurrently for better performance
          const [workspacesData, membershipData] = await Promise.all([
            fetchWorkspaces(),
            fetchMembership(),
          ]);

          // Initialize selected workspaces based on current memberships
          const selected: Record<string, boolean> = {};
          membershipData.forEach((id) => {
            selected[id] = true;
          });
          setSelectedWorkspaces(selected);

          // Ensure loading is set to false when fetch completes
          setIsLoading(false);
        } catch (err) {
          console.error('[@component:AddToWorkspace] Error fetching data:', err);
          setError('Failed to load workspaces');
          setIsLoading(false);
        }
      };

      fetchData();
    }
  }, [isOpen, fetchWorkspaces, fetchMembership, isCachedData]);

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

      // Invalidate membership cache for this item
      const membershipCacheKey = `${itemType}-${itemId}`;
      globalWorkspaceCache.membershipCache.delete(membershipCacheKey);

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
