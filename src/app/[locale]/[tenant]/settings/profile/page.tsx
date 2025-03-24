'use client';

import { useUser } from '@/context';

import { SettingsHeader } from '@/components/settings/SettingsHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

export default function ProfileSettingsPage() {
  const { user } = useUser();

  return (
    <div className="container mx-auto py-6 space-y-8">
      <SettingsHeader
        title="Profile Settings"
        description="Manage your profile information and preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details and profile settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-sm text-muted-foreground">{user?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <p className="text-sm text-muted-foreground capitalize">
                {user?.role?.toLowerCase() || 'User'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
