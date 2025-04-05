'use client';
import { Edit, Trash, AlertCircle, RefreshCcw, MoreHorizontal, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useCallback } from 'react';

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
import { useToast } from '@/components/shadcn/use-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCICD } from '@/hooks/useCICD';
import type { CICDProvider } from '@/types/component/cicdComponentType';

import { CICDFormDialogClient } from '..';

import { CICDEvents } from './CICDEventListener';

interface CICDTableClientProps {
  initialProviders: CICDProvider[];
}

export default function CICDTableClient({ initialProviders }: CICDTableClientProps) {
  const {
    providers: hookProviders,
    isLoading: isLoadingProviders,
    deleteProvider,
    isDeleting,
    isTesting,
  } = useCICD();

  // Use hook providers if available, otherwise use initialProviders
  const providers = hookProviders.length > 0 ? hookProviders : initialProviders;
  const isLoading = isLoadingProviders && initialProviders.length === 0;

  const [selectedProvider, setSelectedProvider] = useState<CICDProvider | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [testingProviders, setTestingProviders] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const t = useTranslations('cicd');
  const c = useTranslations('common');

  // Memoize dialog handlers
  const handleAddEditProvider = useCallback((provider?: CICDProvider) => {
    if (provider) {
      setSelectedProvider(provider);
      setIsEditing(true);
    } else {
      setSelectedProvider(null);
      setIsEditing(false);
    }
    setIsAddEditDialogOpen(true);
  }, []);

  // Memoize delete handler
  const handleDeleteClick = useCallback((provider: CICDProvider) => {
    setSelectedProvider(provider);
    setIsDeleteDialogOpen(true);
  }, []);

  // Memoize test provider handler
  const handleTestProvider = useCallback(
    async (provider: CICDProvider) => {
      try {
        setIsProcessing(true);
        // Set the specific provider as testing
        setTestingProviders((prev) => ({ ...prev, [provider.id]: true }));

        // Dispatch event to notify other components that a test is starting
        window.dispatchEvent(
          new CustomEvent(CICDEvents.CICD_TESTING_CONNECTION, {
            detail: { providerId: provider.id },
          }),
        );

        // Call the API endpoint instead of using the hook's testProvider function
        const response = await fetch('/api/cicd/test-connection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ provider }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to test connection');
        }

        // Show success toast
        toast({
          title: c('connection_success'),
          description: `${provider.name}: ${c('success')}`,
          variant: 'default',
        });
      } catch (error: any) {
        toast({
          title: c('connection_failed'),
          description: `${provider.name}: ${c('failed')} - ${error.message || 'An unexpected error occurred'}`,
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
        // Clear the testing state for this provider
        setTestingProviders((prev) => {
          const updated = { ...prev };
          delete updated[provider.id];
          return updated;
        });

        // Dispatch event to notify other components that the test is complete
        window.dispatchEvent(
          new CustomEvent(CICDEvents.CICD_TESTING_CONNECTION_COMPLETE, {
            detail: { providerId: provider.id },
          }),
        );
      }
    },
    [toast, c],
  );

  // Memoize dialog completion handler
  const handleDialogComplete = useCallback(() => {
    setIsAddEditDialogOpen(false);
  }, []);

  // Memoize delete confirmation handler
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedProvider) return;

    try {
      setIsProcessing(true);
      // Use the hook's deleteProvider function
      await deleteProvider(selectedProvider.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsDeleteDialogOpen(false);
    }
  }, [selectedProvider, toast, deleteProvider]);

  // Memoize provider badge color function
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
  if (providers.length === 0 && !isLoading) {
    return (
      <Card className="border-0">
        <CardContent className="p-0">
          <EmptyState
            icon={<AlertCircle className="h-10 w-10" />}
            title={t('none_title')}
            description={t('none_desc', {
              fallback: 'Add a CI/CD provider to start creating deployments',
            })}
            action={
              <Button
                onClick={() => {
                  // Use event-based communication instead of direct DOM manipulation
                  window.dispatchEvent(new Event(CICDEvents.OPEN_CICD_DIALOG));
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                {t('add_button')}
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0">
      <CardContent>
        <style jsx global>{`
          .provider-testing-animation {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">{c('name')}</TableHead>
              <TableHead>{t('provider_type')}</TableHead>
              <TableHead>{t('provider_url')}</TableHead>
              <TableHead>{t('provider_auth_type')}</TableHead>
              <TableHead className="text-right">{c('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <TableRow
                key={provider.id}
                className={testingProviders[provider.id] ? 'provider-testing-animation' : ''}
              >
                <TableCell className="font-medium">{provider.name}</TableCell>
                <TableCell>
                  <Badge className={getProviderBadgeColor(provider.type)} variant="outline">
                    {t(`provider_type_${provider.type}`)}
                  </Badge>
                </TableCell>
                <TableCell>{provider.url}</TableCell>
                <TableCell>
                  {t(`auth_type_${provider.config?.auth_type}`, {
                    fallback: provider.config?.auth_type || t('auth_type_not_specified'),
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleTestProvider(provider)}
                        disabled={testingProviders[provider.id] || isTesting}
                      >
                        <RefreshCcw
                          className={`mr-2 h-4 w-4 ${testingProviders[provider.id] ? 'animate-spin' : ''}`}
                        />
                        <span>
                          {testingProviders[provider.id] ? c('testing') : c('test_connection')}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddEditProvider(provider)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>{c('edit')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteClick(provider)}
                        disabled={isDeleting}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        <span>{c('delete')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_provider_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProvider &&
                t('delete_provider_confirm', {
                  name: selectedProvider.name,
                })}
              <br />
              <br />
              {t('delete_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing || isDeleting}>
              {c('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing || isDeleting}
            >
              {isProcessing || isDeleting ? 'Deleting...' : c('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Provider Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? t('edit_title') : t('add_title')}</DialogTitle>
          </DialogHeader>
          <CICDFormDialogClient onComplete={handleDialogComplete} isInDialog={true} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
