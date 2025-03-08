'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { 
  getProject, 
  updateProject, 
  deleteProject,
  Project
} from '@/app/actions/projects';

export function useProject(initialProjectId?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(initialProjectId ? true : false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchProject = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getProject(id);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to fetch project'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch project',
          variant: 'destructive',
        });
        return null;
      }
      
      setProject(result.data);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project';
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

  const updateProjectDetails = useCallback(async (
    projectData: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>>
  ) => {
    if (!project?.id) {
      toast({
        title: 'Error',
        description: 'No project selected',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await updateProject(project.id, projectData);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to update project'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to update project',
          variant: 'destructive',
        });
        return null;
      }
      
      setProject(result.data);
      
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
  }, [project, toast]);

  const removeProject = useCallback(async () => {
    if (!project?.id) {
      toast({
        title: 'Error',
        description: 'No project selected',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await deleteProject(project.id);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to delete project'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete project',
          variant: 'destructive',
        });
        return false;
      }
      
      setProject(null);
      
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
  }, [project, toast]);

  // Fetch project on mount if initialProjectId is provided
  useEffect(() => {
    if (initialProjectId) {
      fetchProject(initialProjectId);
    }
  }, [initialProjectId, fetchProject]);

  return {
    project,
    loading,
    error,
    fetchProject,
    updateProject: updateProjectDetails,
    removeProject,
    isLoaded: !loading && project !== null
  };
} 