'use client';

import { Check, ChevronDown, Home, Plus, Star, Trash, Users, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  addWorkspace,
  getActiveWorkspace,
  getUserTeams,
  getWorkspaces,
  makeDefaultWorkspace,
  removeWorkspace,
  setActiveWorkspace as updateActiveWorkspace,
} from '@/app/actions/workspaceAction';
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
import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Workspace } from '@/types/component/workspaceComponentType';

export default function WorkspaceSelector({ className = '' }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] = useState<'private' | 'team'>('private');
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(null);
  const [deleteWorkspaceName, setDeleteWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Get workspaces, active workspace ID, and teams in parallel
      const [workspacesResult, activeWorkspaceResult, teamsResult] = await Promise.all([
        getWorkspaces(),
        getActiveWorkspace(),
        getUserTeams(),
      ]);

      if (teamsResult.success && teamsResult.data) {
        setTeams(teamsResult.data);
      }

      if (workspacesResult.success && workspacesResult.data) {
        setWorkspaces(workspacesResult.data);

        // Store the active workspace ID from profile
        if (activeWorkspaceResult.success && activeWorkspaceResult.data !== undefined) {
          setActiveWorkspaceId(activeWorkspaceResult.data);

          if (activeWorkspaceResult.data) {
            // Find the active workspace from ID
            const active = workspacesResult.data.find((w) => w.id === activeWorkspaceResult.data);
            if (active) {
              setActiveWorkspace(active);
            }
          } else {
            // If active workspace is null, we're in "default" mode (show everything)
            setActiveWorkspace(null);
          }
        } else {
          // Fallback to default workspace if we couldn't get the active workspace
          const defaultWorkspace = workspacesResult.data.find((w) => w.is_default);
          if (defaultWorkspace) {
            setActiveWorkspace(defaultWorkspace);
          } else if (workspacesResult.data.length > 0) {
            setActiveWorkspace(workspacesResult.data[0]);
          }
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleSetActiveWorkspace = async (workspace: Workspace | null) => {
    // Update UI immediately for responsiveness
    setActiveWorkspace(workspace);

    // Update the active workspace in the profile
    const workspaceId = workspace?.id || null;
    setActiveWorkspaceId(workspaceId);

    // Save to database
    await updateActiveWorkspace(workspaceId);
  };

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
    setError(null);

    if (!newWorkspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }

    try {
      const result = await addWorkspace(
        newWorkspaceName,
        newWorkspaceDescription || undefined,
        newWorkspaceType,
        selectedTeamId || undefined,
      );

      if (result.success && result.data) {
        setWorkspaces([...workspaces, result.data]);
        setNewWorkspaceName('');
        setNewWorkspaceDescription('');
        setNewWorkspaceType('private');
        setSelectedTeamId(null);
        setCreateOpen(false);
      } else {
        setError(result.error || 'Failed to create workspace');
        console.error('Error creating workspace:', result.error);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Exception creating workspace:', err);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteWorkspaceId) return;

    const result = await removeWorkspace(deleteWorkspaceId);

    if (result.success) {
      const updatedWorkspaces = workspaces.filter((w) => w.id !== deleteWorkspaceId);
      setWorkspaces(updatedWorkspaces);

      // If we deleted the active workspace, switch to default mode (null)
      if (activeWorkspace?.id === deleteWorkspaceId) {
        handleSetActiveWorkspace(null);
      }

      setDeleteWorkspaceId(null);
      setDeleteWorkspaceName('');
    }
  };

  const confirmDelete = (workspace: Workspace) => {
    setDeleteWorkspaceId(workspace.id);
    setDeleteWorkspaceName(workspace.name);
  };

  const getWorkspaceIcon = (workspace: Workspace) => {
    if (workspace.workspace_type === 'default' || workspace.is_default)
      return <Home className="h-4 w-4" />;
    if (workspace.workspace_type === 'team') return <Users className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
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
                {activeWorkspace ? (
                  <>
                    {getWorkspaceIcon(activeWorkspace)}
                    {activeWorkspace.name}
                  </>
                ) : (
                  <>
                    <Home className="h-4 w-4" />
                    Default (All)
                  </>
                )}
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Your Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Default option - shows everything */}
          <DropdownMenuItem
            key="default"
            className="flex items-center justify-between cursor-pointer"
            onClick={() => handleSetActiveWorkspace(null)}
          >
            <span className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Default (All)
              {activeWorkspaceId === null && <Check className="h-4 w-4 ml-2" />}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleSetActiveWorkspace(workspace)}
            >
              <span className="flex items-center gap-2">
                {getWorkspaceIcon(workspace)}
                {workspace.name}
                {activeWorkspaceId === workspace.id && <Check className="h-4 w-4 ml-2" />}
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
                      aria-label="Make default"
                    />
                    <Trash
                      className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(workspace);
                      }}
                      aria-label="Delete workspace"
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={newWorkspaceType}
                onValueChange={(value) => setNewWorkspaceType(value as 'private' | 'team')}
              >
                <SelectTrigger id="type" className="col-span-3">
                  <SelectValue placeholder="Select workspace type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Private Workspace</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="team">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Team Workspace</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team selection for team workspaces */}
            {newWorkspaceType === 'team' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="team" className="text-right">
                  Team
                </Label>
                <Select value={selectedTeamId || ''} onValueChange={setSelectedTeamId}>
                  <SelectTrigger id="team" className="col-span-3">
                    <SelectValue placeholder="Select team (or use active team)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Use Active Team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            {error && <p className="text-sm text-destructive mb-2 w-full text-left">{error}</p>}
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
