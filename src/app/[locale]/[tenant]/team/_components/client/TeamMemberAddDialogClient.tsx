'use client';

import { Loader2, Plus, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/shadcn/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
import { Label } from '@/components/shadcn/label';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { useAddMultipleTeamMembers, useAvailableTenantProfiles, useDialogState } from '@/hooks';
import { AddMemberDialogProps } from '@/types/context/teamContextType';

type TenantProfile = {
  id: string;
  email: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
};

const AddMemberDialog = ({ open, onOpenChange, teamId }: AddMemberDialogProps) => {
  const t = useTranslations('team');
  const c = useTranslations('common');
  const params = useParams();
  const tenantId = params.tenant as string;

  // State for selected profiles and role
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [role, setRole] = useState('contributor');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available tenant profiles
  const {
    data: availableProfiles = [],
    isLoading: isLoadingProfiles,
    isError,
    error,
  } = useAvailableTenantProfiles(tenantId, teamId);

  // Use the shared dialog utilities
  const { isLoading, executeOperation, showValidationError } = useDialogState();

  // Use the Add Multiple Team Members mutation hook
  const addMultipleTeamMembersMutation = useAddMultipleTeamMembers();

  // Filter profiles based on search query
  const filteredProfiles = searchQuery
    ? (availableProfiles as TenantProfile[]).filter(
        (profile) =>
          profile.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          profile.user.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : (availableProfiles as TenantProfile[]);

  // Reset selected profiles when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedProfiles([]);
      setSearchQuery('');
    }
  }, [open]);

  const handleToggleProfile = (profileId: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId],
    );
  };

  const handleSelectAll = () => {
    if (selectedProfiles.length === filteredProfiles.length) {
      setSelectedProfiles([]);
    } else {
      setSelectedProfiles(filteredProfiles.map((profile) => profile.id));
    }
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!teamId) {
      showValidationError('Team ID is required');
      return;
    }

    if (selectedProfiles.length === 0) {
      showValidationError('Select at least one team member');
      return;
    }

    // Execute the add members operation
    await executeOperation(
      async () => {
        await addMultipleTeamMembersMutation.mutateAsync({
          teamId,
          profileIds: selectedProfiles,
          role,
        });

        // Reset form and close dialog
        setSelectedProfiles([]);
        onOpenChange(false);

        // Dispatch refresh event
        window.dispatchEvent(new Event('refresh-team-members'));
      },
      selectedProfiles.length === 1
        ? `1 member added to the team`
        : `${selectedProfiles.length} members added to the team`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('members_add_title')}</DialogTitle>
          <DialogDescription>{t('members_add_desc')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>{c('select')}</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 px-2 text-xs"
                disabled={filteredProfiles.length === 0}
              >
                {selectedProfiles.length === filteredProfiles.length && filteredProfiles.length > 0
                  ? c('deselect_all')
                  : c('select_all')}
              </Button>
            </div>

            <div className="border rounded-md">
              <Command>
                <CommandInput
                  placeholder={c('search_placeholder')}
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoadingProfiles
                      ? c('loading')
                      : isError
                        ? c('error')
                        : t('members_add_no_results')}
                  </CommandEmpty>
                  <CommandGroup>
                    {isLoadingProfiles ? (
                      <div className="flex justify-center items-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ScrollArea className="h-[240px]">
                        {filteredProfiles.map((profile: TenantProfile) => (
                          <CommandItem
                            key={profile.id}
                            onSelect={() => handleToggleProfile(profile.id)}
                            className="flex items-center gap-2 px-2"
                          >
                            <Checkbox
                              checked={selectedProfiles.includes(profile.id)}
                              onCheckedChange={() => handleToggleProfile(profile.id)}
                              aria-label={`Select ${profile.user.name}`}
                              className="mr-2"
                            />
                            <div className="flex items-center gap-2 flex-1">
                              {profile.user.avatar_url ? (
                                <img
                                  src={profile.user.avatar_url}
                                  alt={profile.user.name}
                                  className="h-6 w-6 rounded-full"
                                />
                              ) : (
                                <User className="h-6 w-6 rounded-full bg-muted p-1" />
                              )}
                              <div className="flex flex-col">
                                <span className="font-medium">{profile.user.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {profile.user.email}
                                </span>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {selectedProfiles.length > 0 && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  {t('members_add_selected_count', { count: selectedProfiles.length })}
                </Label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {c('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={selectedProfiles.length === 0 || isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {t('members_send_invite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
