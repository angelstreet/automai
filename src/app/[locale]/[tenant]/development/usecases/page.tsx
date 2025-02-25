'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useUser } from '@/lib/contexts/UserContext';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';

type Project = {
  id: string;
  name: string;
  usecases: UseCase[];
};

type UseCase = {
  id: string;
  shortId: string;
  name: string;
  projectId: string;
  project_id?: string;
  steps: { platform: string; code: string };
  createdAt: string;
  lastModified?: string;
  author?: string;
  status?: string;
  tags?: string[];
};

export default function UseCasesPage() {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedUseCases, setSelectedUseCases] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [newUseCase, setNewUseCase] = useState({
    projectId: '',
    name: '',
    description: '',
    platform: 'web',
  });
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [favorites, setFavorites] = useState(new Set<string>());
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${params.locale}/login`);
    }
  }, [userLoading, user, router, params.locale]);

  // Fetch projects and use cases
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!session?.accessToken) {
          router.push(`/${params.locale}/login`);
          return;
        }

        const projRes = await fetch('/api/projects', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        if (!projRes.ok) {
          if (projRes.status === 401) {
            router.push(`/${params.locale}/login`);
            return;
          }
          throw new Error('Failed to fetch projects');
        }

        const projectsData = await projRes.json();
        const projectsWithUsecases = await Promise.all(
          projectsData.map(async (p: Project) => {
            try {
              const ucRes = await fetch(
                `http://localhost:5001/api/usecases?projectId=${encodeURIComponent(p.id)}`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                  },
                },
              );

              if (!ucRes.ok) {
                const errorText = await ucRes.text();
                console.error(`Error fetching use cases for project ${p.id}:`, errorText);
                return { ...p, usecases: [] };
              }

              const usecases = await ucRes.json();
              return { ...p, usecases };
            } catch (err) {
              console.error(`Failed to fetch use cases for project ${p.id}:`, err);
              return { ...p, usecases: [] };
            }
          }),
        );
        setProjects(projectsWithUsecases);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to fetch data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchData();
  }, [user, session, params.locale, router, toast]);

  // Set first project as expanded by default
  useEffect(() => {
    if (projects.length > 0 && !expandedProject) {
      setExpandedProject(projects[0].id);
    }
  }, [projects]);

  const toggleFavorite = async (useCaseId: string) => {
    try {
      const newFavorites = new Set(favorites);
      if (newFavorites.has(useCaseId)) {
        newFavorites.delete(useCaseId);
        await fetch(`http://localhost:5001/api/usecases/${useCaseId}/favorite`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });
      } else {
        newFavorites.add(useCaseId);
        await fetch(`http://localhost:5001/api/usecases/${useCaseId}/favorite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });
      }
      setFavorites(newFavorites);
    } catch (err) {
      console.error('Failed to update favorite:', err);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const sortUsecases = (usecases: UseCase[]) => {
    return [...usecases].sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === 'lastModified' || sortConfig.key === 'createdAt') {
        comparison =
          new Date(a[sortConfig.key] || '').getTime() - new Date(b[sortConfig.key] || '').getTime();
      } else if (sortConfig.key === 'steps.platform') {
        comparison = a.steps.platform.localeCompare(b.steps.platform);
      } else {
        comparison = (a[sortConfig.key as keyof UseCase] || '')
          .toString()
          .localeCompare((b[sortConfig.key as keyof UseCase] || '').toString());
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  const getFavoriteUseCases = () => {
    return projects.flatMap((project) => project.usecases.filter((uc) => favorites.has(uc.id)));
  };

  const handleCreate = async () => {
    try {
      if (!newUseCase.projectId || !newUseCase.name) return;

      // Get the platform prefix for shortID
      const platformPrefix =
        newUseCase.platform === 'python'
          ? 'PYT'
          : newUseCase.platform === 'web'
            ? 'WEB'
            : newUseCase.platform === 'desktop'
              ? 'DSK'
              : newUseCase.platform === 'android'
                ? 'AND'
                : newUseCase.platform === 'ios'
                  ? 'IOS'
                  : newUseCase.platform === 'api'
                    ? 'API'
                    : 'API';

      const res = await fetch('http://localhost:5001/api/usecases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          projectId: newUseCase.projectId,
          name: newUseCase.name,
          description: newUseCase.description,
          platform: newUseCase.platform,
          shortIdPrefix: platformPrefix,
          steps: {
            platform: newUseCase.platform,
            code: '',
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to create use case');
      }
      const createdUseCase = await res.json();

      // Get project name before redirecting
      const project = projects.find((p) => p.id === newUseCase.projectId);
      router.push(
        `/${params.locale}/${params.tenant}/development/usecases/edit/${createdUseCase.shortId}?projectName=${encodeURIComponent(project?.name || '')}`,
      );
      setIsCreateDialogOpen(false);
      setNewUseCase({ projectId: '', name: '', description: '', platform: 'web' });
    } catch (err) {
      console.error('Create use case error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create use case');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUseCases.size} use case(s)?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedUseCases).map(async (id) => {
        const response = await fetch(`http://localhost:5001/api/usecases/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete use case ${id}`);
        }
      });

      await Promise.all(deletePromises);

      // Remove deleted use cases from state
      const updatedProjects = projects.map((project) => ({
        ...project,
        usecases: project.usecases.filter((uc) => !selectedUseCases.has(uc.id)),
      }));

      setProjects(updatedProjects);
      setSelectedUseCases(new Set());

      // Exit selection mode if no use cases remain
      if (!updatedProjects.some((p) => p.usecases.length > 0)) {
        setIsSelectionMode(false);
      }

      toast({
        title: 'Success',
        description: 'Selected use cases deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting use cases:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete use cases',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (useCase: UseCase) => {
    try {
      // Get the platform prefix for shortID
      const platformPrefix =
        useCase.steps.platform === 'python'
          ? 'PYT'
          : useCase.steps.platform === 'web'
            ? 'WEB'
            : useCase.steps.platform === 'desktop'
              ? 'DSK'
              : useCase.steps.platform === 'android'
                ? 'AND'
                : useCase.steps.platform === 'ios'
                  ? 'IOS'
                  : useCase.steps.platform === 'api'
                    ? 'API'
                    : 'API';

      const payload = {
        name: `${useCase.name} (Copy)`,
        projectId: useCase.projectId || useCase.project_id,
        steps: useCase.steps,
        description: '',
        platform: useCase.steps.platform,
        shortIdPrefix: platformPrefix,
      };

      const res = await fetch('http://localhost:5001/api/usecases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to duplicate use case');
      }

      const duplicated = await res.json();

      // Update state with the new use case
      setProjects(
        projects.map((project) => {
          if (project.id === (useCase.projectId || useCase.project_id)) {
            return {
              ...project,
              usecases: [...project.usecases, duplicated],
            };
          }
          return project;
        }),
      );

      toast({
        title: 'Success',
        description: 'Use case duplicated successfully',
      });
    } catch (err) {
      console.error('Error duplicating use case:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to duplicate use case',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this use case?')) {
      return;
    }

    try {
      if (!session?.accessToken) {
        router.push(`/${params.locale}/login`);
        return;
      }

      const response = await fetch(`http://localhost:5001/api/usecases/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete use case');
      }

      // Remove the deleted use case from state
      setProjects(
        projects.map((project) => ({
          ...project,
          usecases: project.usecases.filter((uc) => uc.id !== id),
        })),
      );

      toast({
        title: 'Success',
        description: 'Use case deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting use case:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete use case',
        variant: 'destructive',
      });
    }
  };

  const TableHeader = () => (
    <div className="grid grid-cols-12 gap-2 py-2 px-3 bg-muted/50 dark:bg-muted/90 border-b border-border text-xs font-medium text-muted-foreground dark:text-muted-foreground/90">
      {isSelectionMode && (
        <div className="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={selectedUseCases.size > 0}
            onChange={(e) => {
              if (e.target.checked) {
                const allIds = projects.flatMap((p) => p.usecases.map((uc) => uc.id));
                setSelectedUseCases(new Set(allIds));
              } else {
                setSelectedUseCases(new Set());
              }
            }}
          />
        </div>
      )}
      <button
        onClick={() => handleSort('id')}
        className="col-span-2 flex items-center justify-center gap-1 hover:text-foreground dark:hover:text-foreground/90"
      >
        ID {getSortIcon('id')}
      </button>
      <button
        onClick={() => handleSort('name')}
        className="col-span-4 flex items-center justify-center gap-1 hover:text-foreground dark:hover:text-foreground/90"
      >
        Name {getSortIcon('name')}
      </button>
      <button
        onClick={() => handleSort('steps.platform')}
        className="col-span-2 flex items-center justify-center gap-1 hover:text-foreground dark:hover:text-foreground/90"
      >
        Platform {getSortIcon('steps.platform')}
      </button>
      <button
        onClick={() => handleSort('status')}
        className="col-span-2 flex items-center justify-center gap-1 hover:text-foreground dark:hover:text-foreground/90"
      >
        Status {getSortIcon('status')}
      </button>
      <button
        onClick={() => handleSort('lastModified')}
        className="col-span-1 flex items-center justify-center gap-1 hover:text-foreground dark:hover:text-foreground/90"
      >
        Modified {getSortIcon('lastModified')}
      </button>
      <div className="col-span-1 flex items-center justify-center">Info</div>
    </div>
  );

  const UseCaseRow = ({ uc }: { uc: UseCase }) => (
    <div className="grid grid-cols-12 gap-2 py-1.5 px-3 hover:bg-muted/50 dark:hover:bg-muted/30 border-b border-border text-sm text-foreground dark:text-foreground/90">
      {isSelectionMode && (
        <div className="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={selectedUseCases.has(uc.id)}
            onChange={(e) => {
              const newSelected = new Set(selectedUseCases);
              if (e.target.checked) {
                newSelected.add(uc.id);
              } else {
                newSelected.delete(uc.id);
              }
              setSelectedUseCases(newSelected);
            }}
          />
        </div>
      )}
      <div className="col-span-11 grid grid-cols-11 gap-2">
        <div
          className="col-span-10 grid grid-cols-10 gap-2 cursor-pointer"
          onClick={() => {
            const project = projects.find((p) => p.usecases.some((u) => u.id === uc.id));
            router.push(
              `/${params.locale}/${params.tenant}/development/usecases/edit/${uc.shortId}?projectName=${encodeURIComponent(project?.name || '')}`,
            );
          }}
        >
          <div className="col-span-2 font-mono flex items-center justify-center">{uc.shortId}</div>
          <div className="col-span-4 font-medium flex items-center justify-center gap-1">
            {favorites.has(uc.id) && (
              <span className="text-yellow-500 dark:text-yellow-400">★</span>
            )}
            {uc.name}
          </div>
          <div className="col-span-2 flex items-center justify-center">
            {uc.steps.platform === 'web'
              ? '🌐'
              : uc.steps.platform === 'android'
                ? '🤖'
                : uc.steps.platform === 'ios'
                  ? '📱'
                  : uc.steps.platform === 'desktop'
                    ? '💻'
                    : uc.steps.platform === 'python'
                      ? '🐍'
                      : uc.steps.platform === 'api'
                        ? '🔌'
                        : 'Unknown'}
          </div>
          <div className="col-span-2 flex items-center justify-center">
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                uc.status === 'active'
                  ? 'bg-success/20 dark:bg-success/30 text-success dark:text-success/90'
                  : uc.status === 'draft'
                    ? 'bg-warning/20 dark:bg-warning/30 text-warning dark:text-warning/90'
                    : 'bg-muted dark:bg-muted/40 text-muted-foreground dark:text-muted-foreground/90'
              }`}
            >
              {uc.status || 'N/A'}
            </span>
          </div>
        </div>
        <div className="col-span-1 flex items-center justify-center text-xs text-muted-foreground min-h-[20px]">
          {uc.lastModified ? new Date(uc.lastModified).toLocaleDateString() : 'N/A'}
        </div>
      </div>
      <div className="col-span-1 flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUseCase(uc);
          }}
        >
          ℹ️
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background dark:bg-background">
      <div className="flex-1 space-y-4 pt-5">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>
        )}

        {userLoading || isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        ) : (
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-2xl">
                <Input
                  placeholder="Search by ID, name, platform, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {isSelectionMode && projects.some((p) => p.usecases.length > 0) ? (
                <>
                  {selectedUseCases.size > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                      Delete ({selectedUseCases.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedUseCases(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                projects.some((p) => p.usecases.length > 0) && (
                  <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}>
                    Select
                  </Button>
                )
              )}
              <Button onClick={() => setIsCreateDialogOpen(true)}>New</Button>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {getFavoriteUseCases().length > 0 && (
              <div className="bg-background dark:bg-background rounded-lg shadow border border-border">
                <div className="px-4 py-2 bg-muted dark:bg-muted/80 border-b border-border">
                  <h3 className="font-semibold text-foreground dark:text-foreground">
                    ★ Favorite Use Cases
                  </h3>
                </div>
                <TableHeader />
                <div className="max-h-40 overflow-y-auto">
                  {sortUsecases(getFavoriteUseCases()).map((uc) => (
                    <UseCaseRow key={uc.id} uc={uc} />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-background dark:bg-background rounded-lg shadow border border-border"
                >
                  <button
                    onClick={() =>
                      setExpandedProject(expandedProject === project.id ? null : project.id)
                    }
                    className="w-full flex justify-between items-center px-4 py-2 text-left hover:bg-muted/50 dark:hover:bg-muted/20"
                  >
                    <div>
                      <span className="text-lg font-semibold text-foreground">{project.name}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {project.usecases.length === 0
                          ? 'No test cases yet'
                          : `${project.usecases.length} test case${project.usecases.length === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <span
                      className="transform transition-transform duration-200 text-muted-foreground"
                      style={{
                        transform:
                          expandedProject === project.id ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▼
                    </span>
                  </button>
                  {expandedProject === project.id && (
                    <div className="border-t border-border">
                      <TableHeader />
                      <div className="max-h-96 overflow-y-auto">
                        {project.usecases.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <p className="mb-2">No test cases found in this project</p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setNewUseCase({
                                  projectId: project.id,
                                  name: '',
                                  description: '',
                                  platform: 'web',
                                });
                                setIsCreateDialogOpen(true);
                              }}
                            >
                              Create your first test case
                            </Button>
                          </div>
                        ) : (
                          sortUsecases(project.usecases).map((uc) => (
                            <UseCaseRow key={uc.id} uc={uc} />
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isCreateDialogOpen && (
              <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-[49]">
                <div className="bg-background dark:bg-background/95 border border-border dark:border-border/80 w-[500px] rounded-lg shadow-lg dark:shadow-2xl relative z-[50] select-none">
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-foreground dark:text-foreground/90">
                      New Use Case
                    </h2>
                    <div className="space-y-4">
                      <Select
                        onValueChange={(value) =>
                          setNewUseCase({ ...newUseCase, projectId: value })
                        }
                        value={newUseCase.projectId}
                      >
                        <SelectTrigger className="w-full dark:bg-background/90 dark:border-border/80">
                          <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[51] dark:bg-background/95">
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="dark:text-foreground/90">
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Use Case Name"
                        value={newUseCase.name}
                        onChange={(e) => setNewUseCase({ ...newUseCase, name: e.target.value })}
                        className="bg-background dark:bg-background/90"
                      />

                      <Select
                        onValueChange={(value) => setNewUseCase({ ...newUseCase, platform: value })}
                        value={newUseCase.platform}
                        defaultOpen={false}
                      >
                        <SelectTrigger className="w-full dark:bg-background/90 dark:border-border/80">
                          <SelectValue placeholder="Select Platform" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-background/95">
                          <SelectItem value="web" className="dark:text-foreground/90">
                            Web 🌐
                          </SelectItem>
                          <SelectItem value="android" className="dark:text-foreground/90">
                            Android 📱
                          </SelectItem>
                          <SelectItem value="ios" className="dark:text-foreground/90">
                            iOS 📱
                          </SelectItem>
                          <SelectItem value="desktop" className="dark:text-foreground/90">
                            Desktop 💻
                          </SelectItem>
                          <SelectItem value="api" className="dark:text-foreground/90">
                            API 🔌
                          </SelectItem>
                          <SelectItem value="python" className="dark:text-foreground/90">
                            Python 🐍
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground dark:text-muted-foreground/90">
                          Description (Optional)
                        </label>
                        <textarea
                          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background dark:bg-background/90 text-foreground dark:text-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring dark:border-border/80"
                          placeholder="Enter use case description..."
                          value={newUseCase.description}
                          onChange={(e) =>
                            setNewUseCase({ ...newUseCase, description: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-border dark:border-border/80">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsCreateDialogOpen(false);
                            setNewUseCase({
                              projectId: '',
                              name: '',
                              description: '',
                              platform: 'web',
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreate}
                          disabled={!newUseCase.projectId || !newUseCase.name}
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedUseCase && (
              <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100]">
                <div className="bg-background dark:bg-background border border-border w-[600px] rounded-lg shadow-lg relative z-[101]">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground dark:text-foreground">
                          {selectedUseCase.name}
                          <button
                            onClick={() => toggleFavorite(selectedUseCase.id)}
                            className="text-yellow-500 hover:text-yellow-600"
                          >
                            {favorites.has(selectedUseCase.id) ? '★' : '☆'}
                          </button>
                        </h2>
                        <p className="text-sm text-muted-foreground font-mono">
                          {selectedUseCase.shortId}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUseCase(null)}>
                        ✕
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">
                            Platform
                          </label>
                          <div className="mt-1 text-foreground">
                            {selectedUseCase.steps.platform}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">
                            Status
                          </label>
                          <div className="mt-1 text-foreground">
                            {selectedUseCase.status || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">
                            Created
                          </label>
                          <div className="mt-1 text-foreground">
                            {new Date(selectedUseCase.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">
                            Last Modified
                          </label>
                          <div className="mt-1 text-foreground">
                            {selectedUseCase.lastModified
                              ? new Date(selectedUseCase.lastModified).toLocaleString()
                              : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">
                            Author
                          </label>
                          <div className="mt-1 text-foreground">
                            {selectedUseCase.author || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">
                            Tags
                          </label>
                          <div className="mt-1 text-foreground flex gap-1">
                            {selectedUseCase.tags?.map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-muted rounded-full text-xs">
                                {tag}
                              </span>
                            )) || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(selectedUseCase.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            handleDuplicate(selectedUseCase);
                            setSelectedUseCase(null);
                          }}
                        >
                          Duplicate
                        </Button>
                        <Button
                          onClick={() => {
                            const project = projects.find((p) =>
                              p.usecases.some((uc) => uc.id === selectedUseCase.id),
                            );
                            router.push(
                              `/${params.locale}/${params.tenant}/development/usecases/edit/${selectedUseCase.shortId}?projectName=${encodeURIComponent(project?.name || '')}`,
                            );
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
