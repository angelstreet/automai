'use client';

import { useState, useEffect } from 'react';
import { useRepository } from '@/hooks/useRepository';
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
import {
  Edit,
  Save,
  Trash2,
  ArrowLeft,
  RefreshCw,
  GitBranch,
  Lock,
  Unlock,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/shadcn/badge';
import { useTranslations } from 'next-intl';

interface RepositoryDetailProps {
  repositoryId: string;
  onBack?: () => void;
}

export function RepositoryDetail({ repositoryId, onBack }: RepositoryDetailProps) {
  const router = useRouter();
  const t = useTranslations('Repositories');
  const { repository, loading, error, updateRepository, deleteRepository, syncRepository } =
    useRepository(repositoryId);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize form when repository data is loaded
  useEffect(() => {
    if (repository) {
      setName(repository.name);
      setDescription(repository.description || '');
      setDefaultBranch(repository.defaultBranch || '');
    }
  }, [repository]);

  const handleEdit = () => {
    setName(repository?.name || '');
    setDescription(repository?.description || '');
    setDefaultBranch(repository?.defaultBranch || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (
      await updateRepository({
        name,
        description,
        defaultBranch,
      })
    ) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (await deleteRepository()) {
      if (onBack) {
        onBack();
      } else {
        router.push('/repositories');
      }
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await syncRepository();
    setIsSyncing(false);
  };

  const getSyncStatusBadge = () => {
    if (!repository) return null;

    switch (repository.syncStatus) {
      case 'SYNCED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Synced
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        );
      case 'ERROR':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Error
          </Badge>
        );
      default:
        return null;
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
          <CardTitle>{t('error')}</CardTitle>
          <CardDescription>{t('failedToLoadRepository')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error.message}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onBack || (() => router.push('/repositories'))}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!repository) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('repositoryNotFound')}</CardTitle>
          <CardDescription>{t('repositoryNotFoundDescription')}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={onBack || (() => router.push('/repositories'))}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          {isEditing ? (
            <>
              <CardTitle>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('repositoryName')}
                  className="text-xl font-bold"
                />
              </CardTitle>
              <CardDescription>{t('editRepositoryDetails')}</CardDescription>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <CardTitle>{repository.name}</CardTitle>
                {getSyncStatusBadge()}
                {repository.isPrivate ? (
                  <Badge variant="outline" className="bg-slate-50">
                    <Lock className="h-3 w-3 mr-1" /> {t('private')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50">
                    <Unlock className="h-3 w-3 mr-1" /> {t('public')}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {repository.owner} •{' '}
                {t('lastSynced', {
                  date: repository.lastSyncedAt
                    ? new Date(repository.lastSyncedAt).toLocaleDateString()
                    : t('never'),
                })}
              </CardDescription>
            </>
          )}
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {t('sync')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <label htmlFor="description">{t('description')}</label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('repositoryDescriptionPlaceholder')}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="defaultBranch">{t('defaultBranch')}</label>
              <Input
                id="defaultBranch"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder={t('defaultBranchPlaceholder')}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="text-sm font-medium">{t('description')}</h3>
              <p className="text-muted-foreground mt-1">
                {repository.description || t('noDescription')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium">{t('defaultBranch')}</h3>
              <div className="flex items-center mt-1">
                <GitBranch className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{repository.defaultBranch || 'main'}</span>
              </div>
            </div>
            {repository.url && (
              <div>
                <h3 className="text-sm font-medium">{t('repositoryUrl')}</h3>
                <a
                  href={repository.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center mt-1 text-blue-600 hover:underline"
                >
                  {repository.url}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack || (() => router.push('/repositories'))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
        </Button>
        <div className="flex space-x-2">
          {isEditing ? (
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> {t('save')}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" /> {t('edit')}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                <AlertDialogDescription>{t('deleteRepositoryConfirmation')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>{t('delete')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
