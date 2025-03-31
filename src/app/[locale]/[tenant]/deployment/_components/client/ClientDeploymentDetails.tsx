'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/shadcn/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Deployment } from '@/types/core/deployment';

import { ClientDeploymentRunAction } from './ClientDeploymentRunAction';

interface ClientDeploymentDetailsProps {
  deployment: Deployment;
}

export function ClientDeploymentDetails({ deployment }: ClientDeploymentDetailsProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleDeploymentStarted = () => {
    // Refresh the route to update the UI with the new status
    router.refresh();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-2" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{deployment.name}</h1>

        <ClientDeploymentRunAction
          deployment={deployment}
          onDeploymentStarted={handleDeploymentStarted}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Repository:</dt>
                <dd>{deployment.repository_name || 'Not specified'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Target Host:</dt>
                <dd>{deployment.target_host_name || 'Not specified'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Script Path:</dt>
                <dd>{deployment.script_path || 'Not specified'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Status:</dt>
                <dd
                  className={`
                  ${deployment.status === 'success' ? 'text-green-600' : ''}
                  ${deployment.status === 'failed' ? 'text-red-600' : ''}
                  ${deployment.status === 'running' ? 'text-blue-600' : ''}
                  ${deployment.status === 'pending' ? 'text-yellow-600' : ''}
                `}
                >
                  {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Created At:</dt>
                <dd>{new Date(deployment.created_at).toLocaleString()}</dd>
              </div>
              {deployment.started_at && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Started At:</dt>
                  <dd>{new Date(deployment.started_at).toLocaleString()}</dd>
                </div>
              )}
              {deployment.completed_at && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Completed At:</dt>
                  <dd>{new Date(deployment.completed_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {deployment.configuration && Object.keys(deployment.configuration).length > 0 ? (
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-64">
                {JSON.stringify(deployment.configuration, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-500">No configuration specified</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
