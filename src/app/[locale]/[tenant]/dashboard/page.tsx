'use client';

import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  
  // Show loading state while checking auth
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {user && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user.user_metadata?.name || user.email}</h2>
          <p className="text-gray-600 dark:text-gray-300">
            You are logged in to the {user.user_metadata?.tenant_name || 'trial'} tenant.
          </p>
        </div>
      )}
    </div>
  );
}
