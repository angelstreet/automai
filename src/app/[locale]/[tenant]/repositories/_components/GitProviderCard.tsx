import { useState } from 'react';
import { GitProvider } from '@/types/repositories';
import { RefreshCw, Trash2, Github, GitlabIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/shadcn/alert-dialog';

interface GitProviderCardProps {
  provider: GitProvider;
  onDelete: (id: string) => Promise<void>;
  onRefresh: (id: string) => Promise<void>;
  isRefreshing: boolean;
}

export function GitProviderCard({ provider, onDelete, onRefresh, isRefreshing }: GitProviderCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Format the last synced date
  const lastSyncedText = provider.lastSyncedAt
    ? `Last synced ${formatDistanceToNow(new Date(provider.lastSyncedAt), { addSuffix: true })}`
    : 'Never synced';
  
  // Get the provider icon based on the type
  const getProviderIcon = () => {
    // Handle both string and enum types for compatibility
    const providerType = typeof provider.name === 'string' 
      ? provider.name.toUpperCase() 
      : provider.name;
      
    switch (providerType) {
      case 'github':
      case 'GITHUB':
        return <Github className="h-5 w-5" />;
      case 'gitlab':
      case 'GITLAB':
        return <GitlabIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };
  
  // Get provider type display name
  const getProviderTypeName = () => {
    // Handle both string and enum types for compatibility
    const providerType = typeof provider.name === 'string' 
      ? provider.name.toLowerCase() 
      : provider.name;
      
    switch (providerType) {
      case 'github':
        return 'GitHub';
      case 'gitlab':
        return 'GitLab';
      case 'gitea':
        return 'Gitea';
      default:
        return String(provider.name);
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
                <CardDescription>{getProviderTypeName()}</CardDescription>
              </div>
            </div>
            <Badge variant={provider.status !== 'error' ? 'secondary' : 'destructive'}>
              {provider.status === 'connected' ? 'Active' : provider.status === 'error' ? 'Error' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-sm text-muted-foreground">
            {/* Display repository count if available */}
            {provider.repositoryCount || 0} repositories
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
          <span>{lastSyncedText}</span>
          <div className={`flex space-x-2 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-0 h-8 text-destructive hover:text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the Git provider and all associated repositories. This action cannot be undone.
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