'use client';

import { PlusCircle, Edit, Trash, AlertCircle, RefreshCcw, MoreHorizontal } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { toast } from '@/components/shadcn/use-toast';

import {
  getCICDProvidersAction,
  deleteCICDProviderAction,
  testCICDProviderAction,
} from '../actions';
import { CICDProvider as CICDProviderModel } from '../types';

import { CICDProviderForm } from '.';

interface CICDProviderProps {
  removeTitle?: boolean;
}

export default function CICDProvider({ removeTitle = false }: CICDProviderProps) {
  const [providers, setProviders] = useState<CICDProviderModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<CICDProviderModel | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Listen for the add provider event from page
  useEffect(() => {
    const handleAddProviderEvent = () => {
      handleAddEditProvider();
    };

    document.addEventListener('add-cicd-provider', handleAddProviderEvent);

    return () => {
      document.removeEventListener('add-cicd-provider', handleAddProviderEvent);
    };
  }, []);

  // Load providers on component mount
  useEffect(() => {
    loadProviders();
  }, []);

  // Fetch providers from the backend
  const loadProviders = async () => {
    setLoading(true);

    try {
      console.log('CICDProvider component: Calling getCICDProvidersAction');
      const result = await getCICDProvidersAction();

      console.log('CICDProvider component: Received result:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log(
          'CICDProvider component: Setting providers with data:',
          JSON.stringify(result.data, null, 2),
        );
        setProviders(result.data || []);
      } else {
        console.error('CICDProvider component: Error fetching providers:', result.error);
        toast({
          title: 'Error loading providers',
          description: result.error || 'Failed to fetch CI/CD providers',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('CICDProvider component: Exception occurred:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Test a provider connection
  const handleTestProvider = async (provider: CICDProviderModel) => {
    try {
      // Create provider payload for testing
      const providerPayload = {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        url: provider.url,
        config: {
          auth_type: provider.config?.auth_type,
          credentials: provider.config?.credentials,
        },
      };

      const result = await testCICDProviderAction(providerPayload);

      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: 'Successfully connected to the CI/CD provider.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect to the CI/CD provider.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  // Open the add/edit dialog
  const handleAddEditProvider = (provider?: CICDProviderModel) => {
    if (provider) {
      setSelectedProvider(provider);
      setIsEditing(true);
    } else {
      setSelectedProvider(null);
      setIsEditing(false);
    }

    setIsAddEditDialogOpen(true);
  };

  // Open the delete confirmation dialog
  const handleDeleteClick = (provider: CICDProviderModel) => {
    setSelectedProvider(provider);
    setIsDeleteDialogOpen(true);
  };

  // Confirm deletion of a provider
  const handleConfirmDelete = async () => {
    if (!selectedProvider) return;

    try {
      const result = await deleteCICDProviderAction(selectedProvider.id);

      if (result.success) {
        toast({
          title: 'Provider Deleted',
          description: 'The CI/CD provider has been successfully deleted.',
          variant: 'default',
        });

        // Refresh the list
        loadProviders();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete the CI/CD provider',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // Handle dialog completion
  const handleDialogComplete = () => {
    setIsAddEditDialogOpen(false);
    loadProviders();
  };

  // Get provider type badge color
  const getProviderBadgeColor = (type: string) => {
    switch (type) {
      case 'jenkins':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'github':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'gitlab':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'azure_devops':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Card>
      {!removeTitle && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">CI/CD Providers</CardTitle>
          <Button onClick={() => handleAddEditProvider()} size="sm" className="h-8 gap-1">
            <PlusCircle className="h-4 w-4" />
            <span>{t('add_provider')}</span>
          </Button>
        </CardHeader>
      )}

      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-50"></div>
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-2 border-2 border-dashed rounded-lg p-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No CI/CD Providers
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add a CI/CD provider to start creating deployments
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddEditProvider()}
              className="mt-2"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {t('add_provider')}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Auth Type</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell>
                      <Badge className={getProviderBadgeColor(provider.type)}>
                        {provider.type === 'jenkins' && 'Jenkins'}
                        {provider.type === 'github' && 'GitHub Actions'}
                        {provider.type === 'gitlab' && 'GitLab CI'}
                        {provider.type === 'azure_devops' && 'Azure DevOps'}
                        {!['jenkins', 'github', 'gitlab', 'azure_devops'].includes(provider.type) &&
                          provider.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{provider.url}</TableCell>
                    <TableCell>
                      {provider.config?.auth_type === 'token' && 'API Token'}
                      {provider.config?.auth_type === 'basic_auth' && 'Username & Password'}
                      {provider.config?.auth_type === 'oauth' && 'OAuth'}
                      {!provider.config?.auth_type && 'Not specified'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTestProvider(provider)}>
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Test Connection
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddEditProvider(provider)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(provider)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Provider Dialog */}
        <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit CI/CD Provider' : 'Add CI/CD Provider'}</DialogTitle>
            </DialogHeader>
            <CICDProviderForm
              providerId={isEditing ? selectedProvider?.id : undefined}
              provider={isEditing ? selectedProvider : undefined}
              onComplete={handleDialogComplete}
              isInDialog={true}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete CI/CD Provider</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedProvider?.name}"? This action cannot be
                undone and will remove all access to this provider.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
