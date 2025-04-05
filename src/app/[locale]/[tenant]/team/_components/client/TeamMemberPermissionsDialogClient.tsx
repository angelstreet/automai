'use client';

import { Loader2, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { Label } from '@/components/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
// Toast is now handled by useDialogState
import { usePermission, useUpdateMemberRole, useDialogState } from '@/hooks';
import {
  EditPermissionsDialogProps,
  ROLE_TEMPLATES,
  PERMISSIONS,
  ResourcePermissions,
} from '@/types/context/teamContextType';

const EditPermissionsDialog = ({
  open,
  onOpenChange,
  member,
  initialPermissions,
  teamId,
  onSavePermissions,
}: EditPermissionsDialogProps) => {
  const t = useTranslations('team');
  const c = useTranslations('common');
  const [roleTemplate, setRoleTemplate] = useState('custom');
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [permissions, setPermissions] = useState<ResourcePermissions>(
    initialPermissions || ROLE_TEMPLATES.contributor,
  );

  // Use our React Query hooks
  const updateRoleMutation = useUpdateMemberRole();
  const { data: permissionsQuery, success } = usePermission(teamId);

  // Use the shared dialog utilities
  const { isLoading, executeOperation, showValidationError } = useDialogState();

  // Fetch permissions when the dialog opens if not provided as a prop
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!open || initialPermissions || !teamId || !member) return;

      setIsLoadingPermissions(true);
      try {
        // Use the data from our hook if available
        if (success && permissionsQuery) {
          setPermissions(permissionsQuery);
        } else {
          // Default to contributor if can't fetch permissions
          setPermissions(ROLE_TEMPLATES.contributor);
        }
      } catch (error) {
        // Silently handle error by using default permissions
        setPermissions(ROLE_TEMPLATES.contributor);
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    fetchPermissions();
  }, [open, teamId, member, initialPermissions, permissionsQuery, success]);

  const handlePermissionChange = (resource, permission, checked) => {
    setPermissions({
      ...permissions,
      [resource]: {
        ...permissions[resource],
        [permission]: checked,
      },
    });

    // When changing individual permissions, set role to custom
    setRoleTemplate('custom');
  };

  const applyRoleTemplate = async (role) => {
    setRoleTemplate(role);

    if (ROLE_TEMPLATES[role]) {
      setPermissions(ROLE_TEMPLATES[role]);

      // If teamId and member are provided, also apply the role template at the server
      if (teamId && member?.profile_id) {
        await executeOperation(
          async () => {
            // Use our mutation hook
            await updateRoleMutation.mutateAsync({
              teamId,
              profileId: member.profile_id,
              role,
            });
          },
          t('members_edit_role_applied', { role }),
        );
      }
    }
  };

  const handleSubmit = async () => {
    if (!teamId || !member) {
      showValidationError(t('members_edit_missing_team_or_member'));
      return;
    }

    await executeOperation(
      async () => {
        // Call custom handler if provided
        if (onSavePermissions) {
          await onSavePermissions(member, permissions);
        } else {
          // Use our mutation hook for updating the role
          await updateRoleMutation.mutateAsync({
            teamId,
            profileId: member.profile_id,
            role: roleTemplate !== 'custom' ? roleTemplate : 'contributor', // Default to contributor for custom permissions
          });
        }

        onOpenChange(false);
      },
      t('members_edit_success_desc', { name: member.name }),
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  // If we're loading permissions initially, show a loading state
  if (isLoadingPermissions) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] lg:max-w-[900px] mx-auto p-4">
          <DialogHeader className="pb-2">
            <DialogTitle>{t('members_edit_title')}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] lg:max-w-[900px] mx-auto p-4">
        <DialogHeader className="pb-2 space-y-1">
          <DialogTitle>{t('members_edit_title')}</DialogTitle>
          <DialogDescription className="text-xs">{t('members_edit_desc')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={member?.avatar_url || ''} alt={member?.name || ''} />
            <AvatarFallback className="text-xs">{getInitials(member?.name || 'U')}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm leading-tight">{member?.name}</p>
            <p className="text-xs text-muted-foreground leading-tight">{member?.email}</p>
          </div>
        </div>

        {member?.role?.toLowerCase() === 'admin' && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-2 mb-2">
            <p className="text-amber-700 dark:text-amber-400 text-sm flex items-center">
              <ShieldAlert className="h-4 w-4 mr-2" />
              {t('admin_protection_message', {
                fallback: 'Admin users cannot be modified for security reasons',
              })}
            </p>
          </div>
        )}

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="role-template" className="text-sm">
              {t('members_edit_role_template')}
            </Label>
            <Select value={roleTemplate} onValueChange={applyRoleTemplate}>
              <SelectTrigger id="role-template" className="h-8">
                <SelectValue placeholder={t('members_edit_role_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('roles_admin_full')}</SelectItem>
                <SelectItem value="developer">{t('roles_developer')}</SelectItem>
                <SelectItem value="contributor">{t('roles_contributor')}</SelectItem>
                <SelectItem value="viewer">{t('roles_viewer_read_only')}</SelectItem>
                <SelectItem value="tester">{t('roles_tester')}</SelectItem>
                <SelectItem value="custom">{c('custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table className="text-xs w-full">
              <TableHeader className="bg-background sticky top-0 z-10">
                <TableRow>
                  <TableHead className="py-2 w-[150px] min-w-[150px]">
                    {t('members_edit_resource')}
                  </TableHead>
                  {Object.keys(PERMISSIONS).map((perm) => (
                    <TableHead key={perm} className="text-center py-2 px-1 w-[80px] min-w-[80px]">
                      {PERMISSIONS[perm]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(permissions).map((resource) => (
                  <TableRow key={resource} className="h-8">
                    <TableCell className="font-medium py-1 w-[150px] min-w-[150px]">
                      {resource.replace('_', ' ')}
                    </TableCell>
                    {Object.keys(PERMISSIONS).map((permission) => (
                      <TableCell
                        key={`${resource}-${permission}`}
                        className="text-center py-1 px-1 w-[80px] min-w-[80px]"
                      >
                        <Checkbox
                          className="h-4 w-4"
                          checked={permissions[resource][permission]}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(resource, permission, checked)
                          }
                          aria-label={`${PERMISSIONS[permission]} ${resource.replace('_', ' ')}`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="mt-3 space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
            {c('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || member?.role?.toLowerCase() === 'admin'}
            size="sm"
          >
            {isLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {c('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPermissionsDialog;
