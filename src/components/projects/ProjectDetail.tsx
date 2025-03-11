'use client';

import { useState, useEffect } from 'react';
import { useProject } from '@/hooks/useProject';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/shadcn/alert-dialog';
import { useRouter } from 'next/navigation';
import { Edit, Save, Trash2, ArrowLeft } from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  onBack?: () => void;
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const router = useRouter();
  const { project, loading, error, updateProject, removeProject } = useProject(projectId);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Initialize form when project data is loaded
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
    }
  }, [project]);

  const handleEdit = () => {
    setName(project?.name || '');
    setDescription(project?.description || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (await updateProject({ name, description })) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (await removeProject()) {
      if (onBack) {
        onBack();
      } else {
        router.push('/projects');
      }
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-24 mr-2" />
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load project</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error.message}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onBack || (() => router.push('/projects'))}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Project Not Found</CardTitle>
          <CardDescription>The requested project could not be found</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={onBack || (() => router.push('/projects'))}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        {isEditing ? (
          <>
            <CardTitle>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project Name"
                className="text-xl font-bold"
              />
            </CardTitle>
            <CardDescription>Edit project details</CardDescription>
          </>
        ) : (
          <>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>
              Created on {new Date(project.created_at).toLocaleDateString()}
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Project Description"
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-muted-foreground">
            {project.description || 'No description provided'}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack || (() => router.push('/projects'))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex space-x-2">
          {isEditing ? (
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          ) : (
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the project and all
                  associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
