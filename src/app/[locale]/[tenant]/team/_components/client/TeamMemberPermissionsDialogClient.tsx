'use client';

import { Loader2 } from 'lucide-react';
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
import { useToast } from '@/components/shadcn/use-toast';
import {
  EditPermissionsDialogProps,
  ROLE_TEMPLATES,
  PERMISSION_LABELS,
  ResourcePermissions,
} from '@/types/context/team';
import { useUpdateMemberRole } from '@/hooks/teamMember';
import { usePermission } from '@/context';

const EditPermissionsDialog = ({
  open,
  onOpenChange,
  member,
  initialPermissions,
  teamId,
  onSavePermissions,
}: EditPermissionsDialogProps) => {
  const t = useTranslations('team');
  const { toast } = useToast();
  const [roleTemplate, setRoleTemplate] = useState('custom');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [permissions, setPermissions] = useState<ResourcePermissions>(
    initialPermissions || ROLE_TEMPLATES.contributor,
  );

  // Use our React Query hooks
  const updateRoleMutation = useUpdateMemberRole();
  const { data: permissionsQuery, success } = usePermission(teamId);

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
          console.warn('Could not fetch permissions');
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(ROLE_TEMPLATES.contributor);
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    fetchPermissions();
  }, [open, teamId, member, initialPermissions, permissionsQuery]);

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
        try {
          setIsLoading(true);

          // Use our mutation hook
          await updateRoleMutation.mutateAsync({
            teamId,
            profileId: member.profile_id,
            role,
          });

          toast({
            title: t('membersTab.editPermissions.roleApplied'),
            description: t('membersTab.editPermissions.roleAppliedDesc', { role }),
          });
        } catch (error) {
          toast({
            title: t('membersTab.editPermissions.roleApplyError'),
            description: error instanceof Error ? error.message : String(error),
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!teamId || !member) {
      toast({
        title: t('common.error'),
        description: t('membersTab.editPermissions.missingTeamOrMember'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
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

      toast({
        title: t('membersTab.editPermissions.success'),
        description: t('membersTab.editPermissions.successDesc', { name: member.name }),
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('membersTab.editPermissions.saveError'),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{t('membersTab.editPermissions.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('membersTab.editPermissions.title')}</DialogTitle>
          <DialogDescription>{t('membersTab.editPermissions.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-4 py-4">
          <Avatar>
            <AvatarImage src={member?.avatar_url || ''} alt={member?.name || ''} />
            <AvatarFallback>{getInitials(member?.name || 'U')}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{member?.name}</p>
            <p className="text-sm text-muted-foreground">{member?.email}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="role-template">{t('membersTab.editPermissions.roleTemplate')}</Label>
            <Select value={roleTemplate} onValueChange={applyRoleTemplate}>
              <SelectTrigger id="role-template">
                <SelectValue placeholder={t('membersTab.editPermissions.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('roles.adminFull')}</SelectItem>
                <SelectItem value="developer">{t('roles.developer')}</SelectItem>
                <SelectItem value="contributor">{t('roles.contributor')}</SelectItem>
                <SelectItem value="viewer">{t('roles.viewerReadOnly')}</SelectItem>
                <SelectItem value="tester">{t('roles.tester')}</SelectItem>
                <SelectItem value="custom">{t('roles.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md max-h-[300px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[180px]">
                    {t('membersTab.editPermissions.resource')}
                  </TableHead>
                  {Object.keys(PERMISSION_LABELS).map((perm) => (
                    <TableHead key={perm} className="text-center w-[100px]">
                      {t(`permissions.${perm}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(permissions).map((resource) => (
                  <TableRow key={resource}>
                    <TableCell className="font-medium">{t(`resources.${resource}`)}</TableCell>
                    {Object.keys(PERMISSION_LABELS).map((permission) => (
                      <TableCell key={`${resource}-${permission}`} className="text-center">
                        <Checkbox
                          checked={permissions[resource][permission]}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(resource, permission, checked)
                          }
                          aria-label={`${t(`permissions.${permission}`)} ${t(`resources.${resource}`)}`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('membersTab.editPermissions.saveButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPermissionsDialog;
