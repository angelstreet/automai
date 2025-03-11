'use client';

import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { Main } from '@/components/layout/Main';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
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

export default function ProjectsPage() {
  const router = useRouter();
  const t = useTranslations('Projects');
  const { projects, loading, error, addProject, removeProject } = useProjects();
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const result = await addProject({
      name: newProjectName,
      description: newProjectDescription,
    });

    if (result) {
      setNewProjectName('');
      setNewProjectDescription('');
      setIsDialogOpen(false);
    }
  };

  const handleViewProject = (id: string) => {
    router.push(`/projects/${id}`);
  };

  const renderProjects = () => {
    if (loading) {
      return Array(3)
        .fill(0)
        .map((_, i) => (
          <Card key={i} className="w-full">
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-24 mr-2" />
              <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
        ));
    }

    if (error) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t('error')}</CardTitle>
            <CardDescription>{t('failedToLoadProjects')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      );
    }

    if (projects.length === 0) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t('noProjects')}</CardTitle>
            <CardDescription>{t('noProjectsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{t('createYourFirstProject')}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t('createProject')}
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return projects.map((project) => (
      <Card key={project.id} className="w-full">
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>
            {t('createdOn', { date: new Date(project.created_at).toLocaleDateString() })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-2">
            {project.description || t('noDescription')}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => handleViewProject(project.id)}>
            <ExternalLink className="mr-2 h-4 w-4" /> {t('view')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                <AlertDialogDescription>{t('deleteProjectConfirmation')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => removeProject(project.id)}>
                  {t('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    ));
  };

  return (
    <Main>
      <PageHeader title={t('projects')} description={t('manageYourProjects')}>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t('createProject')}
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">{renderProjects()}</div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createNewProject')}</DialogTitle>
            <DialogDescription>{t('fillProjectDetails')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name">{t('projectName')}</label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t('projectNamePlaceholder')}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description">{t('projectDescription')}</label>
              <Textarea
                id="description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder={t('projectDescriptionPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateProject}>{t('create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Main>
  );
}
