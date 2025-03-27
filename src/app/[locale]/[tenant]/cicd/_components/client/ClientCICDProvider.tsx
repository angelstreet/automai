'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Edit, Trash, AlertCircle, RefreshCcw, MoreHorizontal, PlusCircle } from 'lucide-react';
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
import CICDProviderForm from '../CICDProviderForm';
import {
  deleteCICDProvider,
  testCICDProvider,
  createCICDProvider,
  updateCICDProvider,
  getCICDProviders,
} from '@/app/actions/cicd';
import { Badge } from '@/components/shadcn/badge';
import type { CICDProviderType } from '../../types';
import { EmptyState } from '@/components/layout/EmptyState';

interface ClientCICDProviderProps {
  initialProviders: CICDProviderType[];
  removeTitle?: boolean;
}

export default function ClientCICDProvider({
  initialProviders,
  removeTitle = false,
}: ClientCICDProviderProps) {
  const [providers, setProviders] = useState<CICDProviderType[]>(initialProviders);
  const [selectedProvider, setSelectedProvider] = useState<CICDProviderType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Open the add/edit dialog
  const handleAddEditProvider = useCallback((provider?: CICDProviderType) => {
    console.log(
      '[ClientCICDProvider] Opening add/edit dialog',
      provider ? 'edit mode' : 'add mode',
    );
    if (provider) {
      setSelectedProvider(provider);
      setIsEditing(true);
    } else {
      setSelectedProvider(null);
      setIsEditing(false);
    }
    setIsAddEditDialogOpen(true);
  }, []);

  // Listen for the open-provider-dialog event
  useEffect(() => {
    const handleOpenDialog = () => {
      console.log('[ClientCICDProvider] Received open-provider-dialog event');
      handleAddEditProvider();
    };

    console.log('[ClientCICDProvider] Adding open-provider-dialog event listener');
    window.addEventListener('open-provider-dialog', handleOpenDialog);

    return () => {
      window.removeEventListener('open-provider-dialog', handleOpenDialog);
    };
  }, [handleAddEditProvider]);

  // Test a provider connection
  const handleTestProvider = async (provider: CICDProviderType) => {
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
  };

  // Open the delete confirmation dialog
  const handleDeleteClick = useCallback((provider: CICDProviderType) => {
    setSelectedProvider(provider);
    setIsDeleteDialogOpen(true);
  }, []);

  // Handle dialog completion
  const handleDialogComplete = useCallback(async () => {
    setIsAddEditDialogOpen(false);

    // Refresh providers after dialog closes
    try {
      setLoading(true);
      const result = await getCICDProviders();
      if (result.success) {
        setProviders(result.data || []);
      }
    } catch (error) {
      console.error('Error refreshing providers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle provider deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedProvider) return;

    try {
      setLoading(true);
      const result = await deleteCICDProvider(selectedProvider.id);

      if (result.success) {
        // Remove the provider from the list
        setProviders((prev) => prev.filter((p) => p.id !== selectedProvider.id));

        toast({
          title: 'Provider Deleted',
          description: `The provider "${selectedProvider.name}" has been successfully deleted.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete the provider',
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
      setLoading(false);
      setIsDeleteDialogOpen(false);
    }
  }, [selectedProvider, toast]);

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
  if (providers.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={<AlertCircle className="h-10 w-10" />}
            title="No CI/CD Providers"
            description="Add a CI/CD provider to start creating deployments"
            action={
              <Button onClick={() => document.dispatchEvent(new CustomEvent('open-provider-dialog'))}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {!removeTitle && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">CI/CD Providers</CardTitle>
          <Button onClick={() => handleAddEditProvider()} size="sm" className="h-8 gap-1">
            <PlusCircle className="h-4 w-4" />
            <span>Add Provider</span>
          </Button>
        </CardHeader>
      )}

      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-50"></div>
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

        {/* Add/Edit Dialog */}
        <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit CI/CD Provider' : 'Add CI/CD Provider'}</DialogTitle>
            </DialogHeader>
            <CICDProviderForm
              providerId={selectedProvider?.id}
              provider={selectedProvider as any}
              onComplete={handleDialogComplete}
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
