'use client';

import { Plus, Search, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { useAddTeamMember, useDialogState } from '@/hooks';
import { AddMemberDialogProps } from '@/types/context/teamContextType';

const AddMemberDialog = ({ open, onOpenChange, onAddMember, teamId }: AddMemberDialogProps) => {
  const t = useTranslations('team');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('contributor');
  
  // Use the shared dialog utilities
  const { isLoading, executeOperation, showValidationError } = useDialogState();

  // Use the Add Team Member mutation hook
  const addTeamMemberMutation = useAddTeamMember();

  const handleSubmit = async () => {
    // Validate inputs
    if (!teamId) {
      showValidationError('Team ID is required');
      return;
    }

    if (!email) {
      showValidationError('Email is required');
      return;
    }

    // Execute the add member operation
    await executeOperation(
      async () => {
        if (onAddMember) {
          // Use the prop callback if provided
          await onAddMember(email, role);
        } else {
          // Use the mutation hook instead of direct action
          await addTeamMemberMutation.mutateAsync({
            teamId,
            profileId: email, // Using email as profileId for demonstration
            role,
          });
        }
        
        // Reset form and close dialog
        setEmail('');
        onOpenChange(false);
      },
      `${email} added to the team`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('membersTab.addMember.title')}</DialogTitle>
          <DialogDescription>{t('membersTab.addMember.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t('membersTab.addMember.emailLabel')}</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                placeholder={t('membersTab.addMember.emailPlaceholder')}
                type="email"
                className="pl-8"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">{t('membersTab.addMember.roleLabel')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder={t('membersTab.addMember.rolePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                <SelectItem value="developer">{t('roles.developer')}</SelectItem>
                <SelectItem value="contributor">{t('roles.contributor')}</SelectItem>
                <SelectItem value="viewer">{t('roles.viewer')}</SelectItem>
                <SelectItem value="tester">{t('roles.tester')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!email || isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {t('membersTab.addMember.submitButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
