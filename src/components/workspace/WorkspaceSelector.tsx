'use client';

import {
  addWorkspace,
  getWorkspaces,
  makeDefaultWorkspace,
  removeWorkspace,
} from '@/app/actions/workspaceAction';
import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Workspace } from '@/types/component/workspaceComponentType';
import { Check, ChevronDown, Home, Plus, Star, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog';

export default function WorkspaceSelector({ className = '' }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(null);
  const [deleteWorkspaceName, setDeleteWorkspaceName] = useState('');

  useEffect(() => {
    const fetchWorkspaces = async () => {
      setIsLoading(true);
      const result = await getWorkspaces();
      if (result.success && result.data) {
        setWorkspaces(result.data);
        const defaultWorkspace = result.data.find((w) => w.is_default);
        if (defaultWorkspace) {
          setActiveWorkspace(defaultWorkspace);
        } else if (result.data.length > 0) {
          setActiveWorkspace(result.data[0]);
        }
      }
      setIsLoading(false);
    };

    fetchWorkspaces();
  }, []);

  const handleMakeDefault = async (id: string) => {
    const result = await makeDefaultWorkspace(id);
    if (result.success) {
      // Update local state
      const updatedWorkspaces = workspaces.map((w) => ({
        ...w,
        is_default: w.id === id,
      }));
      setWorkspaces(updatedWorkspaces);
      const newDefault = updatedWorkspaces.find((w) => w.id === id);
      if (newDefault) {
        setActiveWorkspace(newDefault);
      }
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    const result = await addWorkspace(newWorkspaceName, newWorkspaceDescription || undefined);

    if (result.success && result.data) {
      setWorkspaces([...workspaces, result.data]);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
      setCreateOpen(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteWorkspaceId) return;

    const result = await removeWorkspace(deleteWorkspaceId);

    if (result.success) {
      const updatedWorkspaces = workspaces.filter((w) => w.id !== deleteWorkspaceId);
      setWorkspaces(updatedWorkspaces);

      // If we deleted the active workspace, switch to the default
      if (activeWorkspace?.id === deleteWorkspaceId) {
        const defaultWorkspace = updatedWorkspaces.find((w) => w.is_default);
        if (defaultWorkspace) {
          setActiveWorkspace(defaultWorkspace);
        } else if (updatedWorkspaces.length > 0) {
          setActiveWorkspace(updatedWorkspaces[0]);
        } else {
          setActiveWorkspace(null);
        }
      }

      setDeleteWorkspaceId(null);
      setDeleteWorkspaceName('');
    }
  };

  const confirmDelete = (workspace: Workspace) => {
    setDeleteWorkspaceId(workspace.id);
    setDeleteWorkspaceName(workspace.name);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`flex items-center gap-2 ${className}`}>
            {isLoading ? (
              'Loading workspaces...'
            ) : (
              <>
                {activeWorkspace?.is_default && <Home className="h-4 w-4" />}
                {activeWorkspace?.name || 'Select Workspace'}
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Your Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setActiveWorkspace(workspace)}
            >
              <span className="flex items-center gap-2">
                {workspace.is_default && <Home className="h-4 w-4" />}
                {workspace.name}
                {activeWorkspace?.id === workspace.id && <Check className="h-4 w-4 ml-2" />}
              </span>
              <span className="flex">
                {!workspace.is_default && (
                  <>
                    <Star
                      className="h-4 w-4 text-muted-foreground hover:text-primary mr-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMakeDefault(workspace.id);
                      }}
                      title="Make default"
                    />
                    <Trash
                      className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(workspace);
                      }}
                      title="Delete workspace"
                    />
                  </>
                )}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add New Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>Add a new workspace to organize your resources.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={newWorkspaceDescription}
                onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteWorkspaceId !== null}
        onOpenChange={(open) => !open && setDeleteWorkspaceId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the workspace &quot;{deleteWorkspaceName}&quot;. This action cannot
              be undone.
              <br />
              <br />
              Note: The content associated with this workspace will not be deleted, only the
              workspace itself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
