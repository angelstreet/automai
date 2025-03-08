'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { 
  getProjects, 
  getProject, 
  createProject, 
  updateProject, 
  deleteProject,
  Project
} from '@/app/actions/projects';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getProjects();
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to fetch projects'));
        return;
      }
      
      setProjects(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch projects'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProject = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getProject(id);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to fetch project'));
        return null;
      }
      
      setCurrentProject(result.data);
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch project'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const addProject = useCallback(async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await createProject(projectData);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to create project'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to create project',
          variant: 'destructive',
        });
        return null;
      }
      
      // Update local state optimistically
      setProjects(prev => [result.data, ...prev]);
      
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const editProject = useCallback(async (id: string, projectData: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>>) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await updateProject(id, projectData);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to update project'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to update project',
          variant: 'destructive',
        });
        return null;
      }
      
      // Update local state optimistically
      setProjects(prev => prev.map(project => 
        project.id === id ? result.data : project
      ));
      
      if (currentProject?.id === id) {
        setCurrentProject(result.data);
      }
      
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentProject, toast]);

  const removeProject = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await deleteProject(id);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to delete project'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete project',
          variant: 'destructive',
        });
        return false;
      }
      
      // Update local state optimistically
      setProjects(prev => prev.filter(project => project.id !== id));
      
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
      
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentProject, toast]);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    currentProject,
    loading,
    error,
    fetchProjects,
    fetchProject,
    addProject,
    editProject,
    removeProject
  };
} 