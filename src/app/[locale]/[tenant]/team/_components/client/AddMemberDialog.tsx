'use client';

import React, { useState } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shadcn/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { useToast } from '@/components/shadcn/use-toast';

import { addTeamMember } from '@/actions/teamMember';
import { AddMemberDialogProps } from '@/types/context/teamMember';

const AddMemberDialog = ({ open, onOpenChange, onAddMember, teamId }: AddMemberDialogProps) => {
  const t = useTranslations('team');
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('contributor');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!teamId) {
      toast({
        title: 'Error',
        description: 'Team ID is required',
        variant: 'destructive',
      });
      return;
    }

    if (!email) {
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the server action to add the member
      if (onAddMember) {
        // Use the prop callback if provided
        await onAddMember(email, role);
      } else {
        // Otherwise use the default action
        const result = await addTeamMember(teamId, email, role);

        if (!result.success) {
          throw new Error(result.error);
        }
      }

      toast({
        title: 'Success',
        description: `${email} added to the team`,
      });

      // Reset form and close dialog
      setEmail('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error adding team member',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
