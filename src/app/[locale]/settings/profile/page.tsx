'use client';

import { SettingsHeader } from '@/components/settings/settings-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from 'next-auth/react';

export default function ProfileSettingsPage() {
  const { data: session } = useSession();

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
              <p className="text-sm text-muted-foreground">{session?.user?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <p className="text-sm text-muted-foreground capitalize">{(session?.user as any)?.role?.toLowerCase() || 'User'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 