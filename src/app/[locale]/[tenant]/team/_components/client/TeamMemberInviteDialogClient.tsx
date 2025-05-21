'use client';

import { Loader2, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useDialogState } from '@/hooks';
import { useInviteTeamMemberByEmail } from '@/hooks/useTeamMemberManagement';

export interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId?: string | null;
}

const InviteMemberDialog = ({ open, onOpenChange, teamId }: InviteMemberDialogProps) => {
  const t = useTranslations('team');
  const c = useTranslations('common');

  // State for email and role
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('contributor');

  // Use the shared dialog utilities
  const { isLoading, executeOperation, showValidationError } = useDialogState();

  // Use the mutation hook for inviting by email
  const inviteTeamMemberMutation = useInviteTeamMemberByEmail();

  // Reset the form when the dialog changes
  React.useEffect(() => {
    if (!open) {
      setEmail('');
      setRole('contributor');
    }
  }, [open]);

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

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showValidationError('Please enter a valid email address');
      return;
    }

    // Execute the invite operation
    await executeOperation(async () => {
      await inviteTeamMemberMutation.mutateAsync({
        teamId,
        email,
        role,
      });

      // Reset form and close dialog
      setEmail('');
      setRole('contributor');
      onOpenChange(false);

      // Dispatch refresh event
      window.dispatchEvent(new Event('refresh-team-members'));
    }, 'Invitation sent successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('members_invite')}</DialogTitle>
          <DialogDescription>{t('members_add_desc')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{c('email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('members_add_email_placeholder')}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">{t('members_role')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder={t('members_add_role_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('roles_admin')}</SelectItem>
                <SelectItem value="developer">{t('roles_developer')}</SelectItem>
                <SelectItem value="contributor">{t('roles_contributor')}</SelectItem>
                <SelectItem value="viewer">{t('roles_viewer')}</SelectItem>
                <SelectItem value="tester">{t('roles_tester')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {c('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {t('members_send_invite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
