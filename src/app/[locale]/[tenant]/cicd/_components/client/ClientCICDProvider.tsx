'use client';

import React, { useState, useEffect, useCallback, useTransition, useOptimistic } from 'react';
import { Edit, Trash, AlertCircle, RefreshCcw, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
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
import { useToast } from '@/components/shadcn/use-toast';
import { CICDProviderForm } from '../';
import {
  deleteCICDProvider,
  testCICDProvider,
  createCICDProvider,
  updateCICDProvider,
} from '@/app/actions/cicd';
import { Badge } from '@/components/shadcn/badge';
import type { CICDProviderType } from '../../types';

interface ClientCICDProviderProps {
  initialProviders: CICDProviderType[];
  removeTitle?: boolean;
}

export default function ClientCICDProvider({
  initialProviders,
  removeTitle = false,
}: ClientCICDProviderProps) {
  const [providers, setProviders] = useState<CICDProviderType[]>(initialProviders);
  const [isPending, startTransition] = useTransition();
  const [selectedProvider, setSelectedProvider] = useState<CICDProviderType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Set up optimistic state updates
  const [optimisticProviders, addOptimisticProvider] = useOptimistic(
    providers,
    (state, update: { action: string; provider?: CICDProviderType; id?: string }) => {
      if (update.action === 'add' && update.provider) {
        return [...state, update.provider];
      } else if (update.action === 'delete' && update.id) {
        return state.filter((provider) => provider.id !== update.id);
      } else if (update.action === 'update' && update.provider) {
        return state.map((provider) =>
          provider.id === update.provider?.id ? update.provider : provider,
        );
      }
      return state;
    },
  );

  // Listen for the add provider event from page
  useEffect(() => {
    const handleAddProviderEvent = () => {
      handleAddEditProvider();
    };

    const addButton = document.getElementById('add-provider-button');
    if (addButton) {
      addButton.addEventListener('click', handleAddProviderEvent);
    }

    return () => {
      if (addButton) {
        addButton.removeEventListener('click', handleAddProviderEvent);
      }
    };
  }, []);

  // Test a provider connection
  const handleTestProvider = useCallback(
    async (provider: CICDProviderType) => {
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

        const result = await testCICDProvider(providerPayload);

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
    },
    [toast],
  );

  // Open the add/edit dialog
  const handleAddEditProvider = useCallback((provider?: CICDProviderType) => {
    if (provider) {
      setSelectedProvider(provider);
      setIsEditing(true);
    } else {
      setSelectedProvider(null);
      setIsEditing(false);
    }

    setIsAddEditDialogOpen(true);
  }, []);

  // Open the delete confirmation dialog
  const handleDeleteClick = useCallback((provider: CICDProviderType) => {
    setSelectedProvider(provider);
    setIsDeleteDialogOpen(true);
  }, []);

  // Confirm deletion of a provider
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedProvider) return;

    try {
      // Optimistic UI update
      addOptimisticProvider({ action: 'delete', id: selectedProvider.id });

      // Start server action in a transition
      startTransition(async () => {
        const result = await deleteCICDProvider(selectedProvider.id);

        if (result.success) {
          // Update providers state
          setProviders((prev) => prev.filter((provider) => provider.id !== selectedProvider.id));

          toast({
            title: 'Provider Deleted',
            description: 'The CI/CD provider has been successfully deleted.',
            variant: 'default',
          });
        } else {
          // Revert optimistic update on failure
          setProviders(initialProviders);

          toast({
            title: 'Error',
            description: result.error || 'Failed to delete the CI/CD provider',
            variant: 'destructive',
          });
        }
      });
    } catch (error: any) {
      // Revert optimistic update on error
      setProviders(initialProviders);

      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  }, [selectedProvider, initialProviders, addOptimisticProvider, toast]);

  // Handle form submission for add/edit
  const handleFormSubmit = useCallback(
    async (formData: any) => {
      try {
        if (isEditing && selectedProvider) {
          // Editing an existing provider
          const result = await updateCICDProvider(selectedProvider.id, formData);

          if (result.success && result.data) {
            // Update providers state with the result
            setProviders((prev) =>
              prev.map((provider) =>
                provider.id === selectedProvider.id ? (result.data as CICDProviderType) : provider,
              ),
            );

            toast({
              title: 'Provider Updated',
              description: 'The CI/CD provider has been successfully updated.',
              variant: 'default',
            });
          } else {
            toast({
              title: 'Error',
              description: result.error || 'Failed to update the CI/CD provider',
              variant: 'destructive',
            });
          }
        } else {
          // Adding a new provider
          // Optimistic UI update with temporary ID
          const tempId = `temp-${Date.now()}`;
          const optimisticProvider = {
            ...formData,
            id: tempId,
          };

          addOptimisticProvider({
            action: 'add',
            provider: optimisticProvider as CICDProviderType,
          });

          // Start server action in a transition
          startTransition(async () => {
            const result = await createCICDProvider(formData);

            if (result.success && result.data) {
              // Update providers array with the real data from the server
              setProviders((prev) => [
                ...prev.filter((p) => p.id !== tempId), // Remove optimistic entry
                result.data as CICDProviderType, // Add the real entry
              ]);

              toast({
                title: 'Provider Added',
                description: 'The CI/CD provider has been successfully added.',
                variant: 'default',
              });
            } else {
              // Remove optimistic entry on failure
              setProviders((prev) => prev.filter((p) => p.id !== tempId));

              toast({
                title: 'Error',
                description: result.error || 'Failed to add the CI/CD provider',
                variant: 'destructive',
              });
            }
          });
        }

        // Close the dialog
        setIsAddEditDialogOpen(false);
        return true;
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
        return false;
      }
    },
    [isEditing, selectedProvider, addOptimisticProvider, toast],
  );

  // Get provider type badge color
  const getProviderBadgeColor = useCallback((type: string) => {
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
  }, []);

  // Empty state render
  if (optimisticProviders.length === 0) {
    return (
      <Card>
        <CardContent>
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
              Add Provider
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
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
              {optimisticProviders.map((provider) => (
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

        {/* Add/Edit Dialog */}
        <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit CI/CD Provider' : 'Add CI/CD Provider'}</DialogTitle>
            </DialogHeader>
            <CICDProviderForm
              providerId={selectedProvider?.id}
              provider={selectedProvider as any}
              onSubmit={handleFormSubmit}
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
