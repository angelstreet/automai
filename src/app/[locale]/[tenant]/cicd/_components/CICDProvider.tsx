"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash, AlertCircle, RefreshCcw, MoreHorizontal } from 'lucide-react';
import { useCICD } from '@/context';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog';
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
import { toast } from '@/components/shadcn/use-toast';
import { CICDProviderForm } from './';
import { Badge } from '@/components/shadcn/badge';
import { CICDProvider as CICDProviderType } from '@/types/cicd';

export default function CICDProvider() {
  const [selectedProvider, setSelectedProvider] = useState<CICDProviderType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Use state to store context values so they update properly
  const [contextValues, setContextValues] = useState({
    providers: [] as CICDProviderType[],
    loading: false,
    error: null as string | null,
    contextIsNull: true, // Track if context is null
  });
  
  // Use the CICD context with better error handling
  let fetchProviders = async () => { console.log('CICD context not initialized'); };
  let testProvider = async () => ({ success: false, error: 'CICD context not initialized' });
  let deleteProvider = async () => ({ success: false, error: 'CICD context not initialized' });
  
  try {
    const cicdContext = useCICD();
    
    // Update functions whenever context changes
    useEffect(() => {
      if (cicdContext) {
        // Update state with values from context
        setContextValues({
          providers: cicdContext.providers || [],
          loading: cicdContext.loading || false,
          error: cicdContext.error || null,
          contextIsNull: false,
        });
        
        // Update functions
        fetchProviders = cicdContext.fetchProviders || fetchProviders;
        testProvider = cicdContext.testProvider || testProvider;
        deleteProvider = cicdContext.deleteProvider || deleteProvider;
        
        console.log('[CICDProvider] Context updated with values:', {
          providersCount: cicdContext.providers?.length || 0
        });
      } else {
        setContextValues(prev => ({
          ...prev,
          contextIsNull: true
        }));
      }
    }, [cicdContext]);
    
    // Debug logging for troubleshooting
    console.log('[CICDProvider] CICD context received:', {
      providersLength: cicdContext?.providers?.length || 0,
      contextIsNull: cicdContext === null,
      contextKeys: cicdContext ? Object.keys(cicdContext) : 'none'
    });
  } catch (error: any) {
    console.error('CICDProvider component: Exception occurred:', error);
    toast({
      title: 'Error',
      description: error.message || 'An unexpected error occurred',
      variant: 'destructive',
    });
  }
  
  // Destructure values from state for use in component
  const { providers, loading, error, contextIsNull } = contextValues;
  
  // Load providers on component mount
  useEffect(() => {
    console.log('CICDProvider component: Initial mount - loading providers');
    if (!providers || providers.length === 0) {
      loadProviders();
    }
  }, []);
  
  // Fetch providers from the context
  const loadProviders = async () => {
    try {
      console.log('CICDProvider component: Calling fetchProviders');
      await fetchProviders();
      console.log('CICDProvider component: Providers loaded successfully');
    } catch (error: any) {
      console.error('CICDProvider component: Exception occurred:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Test a provider connection using the context
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
          credentials: provider.config?.credentials
        }
      };
      
      // Use the testProvider function from context
      const result = await testProvider(providerPayload);
      
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: 'Successfully connected to the CI/CD provider.',
          variant: 'success',
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
  const handleAddEditProvider = (provider?: CICDProviderType) => {
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
  const handleDeleteClick = (provider: CICDProviderType) => {
    setSelectedProvider(provider);
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm deletion of a provider using the context
  const handleConfirmDelete = async () => {
    if (!selectedProvider) return;
    
    try {
      // Use the deleteProvider function from context
      const result = await deleteProvider(selectedProvider.id);
      
      if (result.success) {
        toast({
          title: 'Provider Deleted',
          description: 'The CI/CD provider has been successfully deleted.',
          variant: 'success',
        });
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
  
  // Debug providers data before render
  console.log('[CICDProvider] Debug before render:', {
    providersArray: providers,
    providersLength: providers?.length,
    isLoading: loading,
    hasError: !!error,
    contextNull: contextIsNull
  });

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">CI/CD Providers</CardTitle>
        <Button
          onClick={() => handleAddEditProvider()}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium"
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          <span>Add Provider</span>
        </Button>
      </CardHeader>
      
      <CardContent className="pt-4">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-50"></div>
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-2 border-2 border-dashed rounded-lg p-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No CI/CD Providers</p>
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
              Add Provider
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
                        {!['jenkins', 'github', 'gitlab', 'azure_devops'].includes(provider.type) && provider.type}
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
              provider={selectedProvider}
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
                Are you sure you want to delete "{selectedProvider?.name}"? This action cannot be undone and will remove all access to this provider.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
} 