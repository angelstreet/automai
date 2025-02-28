'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/Shadcn/button';
import { Input } from '@/components/Shadcn/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/Shadcn/accordion';
import { useUser } from '@/lib/contexts/UserContext';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Shadcn/use-toast';
import { Project, UseCase, NewUseCase } from '@/types/usecase';
import { PLATFORM_PREFIXES } from '@/constants/platforms';
import { UseCaseList } from '../../usecases/_components/UseCaseList';
import { CreateUseCase } from '../../usecases/_components/CreateUseCase';

export default function UseCasesPage() {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedUseCases, setSelectedUseCases] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUseCase, setNewUseCase] = useState<NewUseCase>({
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

  useEffect(() => {
    if (expandedProject) {
      setSelectedProject(expandedProject);
    }
  }, [expandedProject, setSelectedProject]);

  useEffect(() => {
    // Remove fetchUseCases from dependency array
    // Logic here
  }, []);

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

  const handleCreate = async () => {
    try {
      if (!newUseCase.projectId || !newUseCase.name) return;

      const platformPrefix =
        PLATFORM_PREFIXES[newUseCase.platform as keyof typeof PLATFORM_PREFIXES] || 'API';

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
        throw new Error('Failed to create use case');
      }

      const createdUseCase = await res.json();
      setProjects((current) =>
        current.map((p) =>
          p.id === newUseCase.projectId ? { ...p, usecases: [...p.usecases, createdUseCase] } : p,
        ),
      );

      setIsCreateDialogOpen(false);
      setNewUseCase({
        projectId: '',
        name: '',
        description: '',
        platform: 'web',
      });
    } catch (err) {
      console.error('Failed to create use case:', err);
      toast({
        title: 'Error',
        description: 'Failed to create use case',
        variant: 'destructive',
      });
    }
  };

  const handleEditUseCase = (useCase: UseCase) => {
    router.push(`/${params.locale}/${params.tenant}/development/usecases/edit/${useCase.id}`);
  };

  const handleNewUseCaseChange = (field: keyof NewUseCase, value: string) => {
    setNewUseCase((prev) => ({ ...prev, [field]: value }));
  };

  const filteredProjects = projects.map((project) => ({
    ...project,
    usecases: project.usecases.filter((uc) =>
      uc.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  }));

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Use Cases</h1>
        <div className="space-x-2">
          <Button onClick={() => setIsSelectionMode(!isSelectionMode)}>
            {isSelectionMode ? 'Cancel Selection' : 'Select'}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>Create New</Button>
        </div>
      </div>

      <Input
        placeholder="Search use cases..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      {isCreateDialogOpen && (
        <CreateUseCase
          projects={projects}
          newUseCase={newUseCase}
          onClose={() => setIsCreateDialogOpen(false)}
          onChange={handleNewUseCaseChange}
          onSubmit={handleCreate}
        />
      )}

      <Accordion
        type="single"
        value={expandedProject || undefined}
        onValueChange={setExpandedProject}
      >
        {filteredProjects.map((project) => (
          <AccordionItem key={project.id} value={project.id}>
            <AccordionTrigger>
              {project.name} ({project.usecases.length})
            </AccordionTrigger>
            <AccordionContent>
              <UseCaseList
                usecases={sortUsecases(project.usecases)}
                favorites={favorites}
                selectedUseCases={selectedUseCases}
                isSelectionMode={isSelectionMode}
                onToggleFavorite={toggleFavorite}
                onSelect={(id) => {
                  const newSelected = new Set(selectedUseCases);
                  if (newSelected.has(id)) {
                    newSelected.delete(id);
                  } else {
                    newSelected.add(id);
                  }
                  setSelectedUseCases(newSelected);
                }}
                onEdit={handleEditUseCase}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
