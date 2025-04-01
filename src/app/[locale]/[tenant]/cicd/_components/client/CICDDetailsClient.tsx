'use client';
import { Edit, Trash, AlertCircle, RefreshCcw, MoreHorizontal, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState, useCallback } from 'react';

import { useCICD } from '@/hooks';
import { EmptyState } from '@/components/ui/EmptyState';
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
import { useToast } from '@/components/shadcn/use-toast';

import type { CICDProviderType } from '../../types';
import CICDForm from '../CICDForm';

interface CICDDetailsClientProps {
  initialProviders: CICDProviderType[];
  removeTitle?: boolean;
}

export default function CICDDetailsClient({
  initialProviders,
  removeTitle = false,
}: CICDDetailsClientProps) {
  const [selectedProvider, setSelectedProvider] = useState<CICDProviderType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations('cicd');
  const router = useRouter();

  // Memoize dialog handlers
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

  // Memoize delete handler
  const handleDeleteClick = useCallback((provider: CICDProviderType) => {
    setSelectedProvider(provider);
    setIsDeleteDialogOpen(true);
  }, []);

  // Use the CICD hook
  const { testProvider, deleteProvider, isTesting, isDeleting } = useCICD();

  // Memoize test provider handler
  const handleTestProvider = useCallback(
    async (provider: CICDProviderType) => {
      try {
        setIsLoading(true);
        // Use the hook's testProvider function instead of the direct action
        await testProvider(provider.id);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, testProvider],
  );

  // Memoize dialog completion handler
  const handleDialogComplete = useCallback(() => {
    setIsAddEditDialogOpen(false);
    router.refresh(); // Use Next.js router refresh to trigger server revalidation
  }, [router]);

  // Memoize delete confirmation handler
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedProvider) return;

    try {
      setIsLoading(true);
      // Use the hook's deleteProvider function instead of the direct action
      const result = await deleteProvider(selectedProvider.id);

      if (result.success) {
        router.refresh(); // Use Next.js router refresh to trigger server revalidation
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  }, [selectedProvider, deleteProvider, toast, router]);

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
  if (initialProviders.length === 0 && !isLoading) {
    return (
      <Card className="border-0">
        <CardContent className="p-0">
          <EmptyState
            icon={<AlertCircle className="h-10 w-10" />}
            title={t('no_providers_title', { fallback: 'No CI/CD Providers' })}
            description={t('no_providers_description', {
              fallback: 'Add a CI/CD provider to start creating deployments',
            })}
            action={
              <Button onClick={() => handleAddEditProvider()}>
                <PlusCircle className="h-4 w-4 mr-2" />
                {t('add_provider', { fallback: 'Add Provider' })}
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0">
      {!removeTitle && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">
            {t('providers_title', { fallback: 'CI/CD Providers' })}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">{t('provider_name')}</TableHead>
              <TableHead>{t('provider_type')}</TableHead>
              <TableHead>{t('provider_url')}</TableHead>
              <TableHead>{t('provider_auth_type')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialProviders.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell className="font-medium">{provider.name}</TableCell>
                <TableCell>
                  <Badge className={getProviderBadgeColor(provider.type)} variant="outline">
                    {t(`provider_type_${provider.type}`, { fallback: provider.type })}
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
                      <DropdownMenuItem onClick={() => handleTestProvider(provider)}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        <span>{t('test_connection')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddEditProvider(provider)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>{t('edit')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteClick(provider)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        <span>{t('delete')}</span>
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
            <AlertDialogTitle>{t('delete_provider_dialog_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProvider &&
                t('delete_provider_confirmation', {
                  name: selectedProvider.name,
                })}
              <br />
              <br />
              {t('delete_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? t('deleting', { fallback: 'Deleting...' }) : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Provider Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? t('edit_provider_dialog_title', { fallback: 'Edit CI/CD Provider' })
                : t('add_provider_dialog_title', { fallback: 'Add CI/CD Provider' })}
            </DialogTitle>
          </DialogHeader>
          <CICDForm
            providerId={selectedProvider?.id}
            provider={selectedProvider}
            onComplete={handleDialogComplete}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
