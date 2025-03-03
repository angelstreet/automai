import { GitProvider } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Trash2, Github, GitlabIcon } from 'lucide-react';
import { useState } from 'react';

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
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

interface GitProviderCardProps {
  provider: GitProvider;
  onDelete: (id: string) => Promise<void>;
  onRefresh: (id: string) => Promise<void>;
  isRefreshing: boolean;
}

export function GitProviderCard({
  provider,
  onDelete,
  onRefresh,
  isRefreshing,
}: GitProviderCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Format the last synced date
  const lastSyncedText = provider.lastSyncedAt
    ? `Last synced ${formatDistanceToNow(new Date(provider.lastSyncedAt), { addSuffix: true })}`
    : 'Never synced';

  // Get the provider icon based on the type
  const getProviderIcon = () => {
    switch (provider.type) {
      case 'GITHUB':
        return <Github className="h-5 w-5" />;
      case 'GITLAB':
        return <GitlabIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Card
        className="overflow-hidden transition-all duration-200 hover:shadow-md"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              {getProviderIcon()}
              <div>
                <CardTitle className="text-lg font-semibold">{provider.displayName}</CardTitle>
                <CardDescription>{provider.type.toLowerCase()}</CardDescription>
              </div>
            </div>
            <Badge variant={provider.isActive ? 'secondary' : 'destructive'}>
              {provider.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-sm text-muted-foreground">
            {provider.repositoryCount || 0} repositories
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
          <span>{lastSyncedText}</span>
          <div
            className={`flex space-x-2 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}
          >
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-8"
              onClick={() => onRefresh(provider.id)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-8 text-destructive hover:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the Git provider and all associated repositories. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await onDelete(provider.id);
                setIsDeleteDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
