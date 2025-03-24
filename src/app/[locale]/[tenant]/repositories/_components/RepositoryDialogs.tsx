import React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';

import { EnhancedConnectRepositoryDialog } from './EnhancedConnectRepositoryDialog';
import { ConnectRepositoryValues } from '../types';

interface RepositoryDialogsProps {
  connectDialogOpen: boolean;
  setConnectDialogOpen: (open: boolean) => void;
  onConnectRepository: (values: ConnectRepositoryValues) => Promise<void>;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  onConfirmDelete: () => Promise<void>;
  onCancelDelete: () => void;
  isDeleting: string | null;
}

export function RepositoryDialogs({
  connectDialogOpen,
  setConnectDialogOpen,
  onConnectRepository,
  deleteDialogOpen,
  setDeleteDialogOpen,
  onConfirmDelete,
  onCancelDelete,
  isDeleting,
}: RepositoryDialogsProps) {
  const t = useTranslations('repositories');

  return (
    <>
      <EnhancedConnectRepositoryDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onSubmit={onConnectRepository}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDeleteRepository')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{t('deleteRepositoryWarning')}</DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={!!isDeleting}>
              {t('deleteAction')}
            </Button>
            <Button variant="outline" onClick={onCancelDelete} disabled={!!isDeleting}>
              {t('cancelAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 