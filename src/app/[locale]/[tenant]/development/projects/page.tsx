'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  Row,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/Shadcn/table';
import { Button } from '@/components/Shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/Shadcn/dialog';
import { Input } from '@/components/Shadcn/input';
import { Textarea } from '@/components/Shadcn/textarea';
import { useToast } from '@/components/Shadcn/use-toast';
import { Alert, AlertDescription } from '@/components/Shadcn/alert';
import { PlanType, getUpgradeMessage } from '@/lib/features';
import { useUser } from '@/lib/contexts/UserContext';

// Type matching Prisma Project model
type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const { user } = useUser();

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        if (!session?.accessToken) {
          throw new Error('Not authenticated');
        }

        const res = await fetch('/api/projects', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        } else {
          throw new Error('Failed to fetch projects');
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to fetch projects',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    if (status === 'authenticated') fetchProjects();
  }, [session, status, toast]);

  // Define table columns
  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }: { row: Row<Project> }) => row.getValue('name'),
      enableSorting: true,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }: { row: Row<Project> }) => row.original.description || '-',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ row }: { row: Row<Project> }) =>
        new Date(row.getValue('createdAt')).toLocaleDateString(),
      enableSorting: true,
    },
    {
      id: 'actions',
      cell: ({ row }: { row: Row<Project> }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditingProject(row.original)}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDelete(row.original.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // CRUD handlers
  const handleCreate = async () => {
    if (!session?.accessToken || !user?.id || !newProject.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please make sure you are logged in and have entered a project name.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    // Check for duplicate project name
    const trimmedName = newProject.name.trim();
    const isDuplicate = projects.some(
      (project) => project.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (isDuplicate) {
      toast({
        title: 'Error',
        description: 'A project with this name already exists. Please choose a different name.',
        variant: 'destructive',
      });
      setIsCreating(false);
      return;
    }

    // Check trial limitations
    if (!checkCanCreateMore('maxProjects', projects.length)) {
      toast({
        title: 'Trial Limit Reached',
        description: getUpgradeMessage(user?.plan as PlanType, 'maxProjects'),
        variant: 'destructive',
      });
      setIsCreating(false);
      return;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          name: newProject.name.trim(),
          description: newProject.description?.trim(),
          ownerId: user.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const createdProject = await res.json();
      setProjects([...projects, createdProject]);
      setIsDialogOpen(false);
      setNewProject({ name: '', description: '' });
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editingProject || !session?.accessToken) return;
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          name: editingProject.name,
          description: editingProject.description,
        }),
      });
      if (res.ok) {
        const updatedProject = await res.json();
        setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
        setEditingProject(null);
        toast({
          title: 'Success',
          description: 'Project updated successfully',
        });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update project',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!session?.accessToken) return;
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
        toast({
          title: 'Success',
          description: 'Project deleted successfully',
        });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete project',
        variant: 'destructive',
      });
    }
  };

  // Trial limitation warning and check
  const hasReachedTrialLimit =
    user?.plan === 'TRIAL' && !checkCanCreateMore('maxProjects', projects.length);
  const showTrialWarning = hasReachedTrialLimit;

  return (
    <div className="flex-1 space-y-4 pt-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={hasReachedTrialLimit}>New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Name"
                value={newProject.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewProject({ ...newProject, name: e.target.value })
                }
              />
              <Textarea
                placeholder="Description (optional)"
                value={newProject.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setNewProject({ ...newProject, description: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                type="button"
                disabled={!newProject.name.trim() || isCreating || hasReachedTrialLimit}
              >
                {isCreating ? 'Creating...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showTrialWarning && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>You have reached the limitation - Upgrade to Pro for unlimited projects</span>
            <Button variant="outline" size="sm" onClick={() => router.push(`/${params.locale}/${params.tenant}/settings/billing`)}>
              Upgrade to Pro
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Edit Dialog */}
      {editingProject && (
        <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Name"
                value={editingProject.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingProject({ ...editingProject, name: e.target.value })
                }
              />
              <Textarea
                placeholder="Description (optional)"
                value={editingProject.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditingProject({
                    ...editingProject,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <DialogFooter>
              <Button onClick={handleEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`select-none ${header.column.getCanSort() ? 'cursor-pointer' : ''}`}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  No projects found. Create your first project!
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="select-none hover:bg-muted">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
