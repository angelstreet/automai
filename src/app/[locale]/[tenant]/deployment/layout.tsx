'use client';

import React from 'react';
import { DeploymentNavbar } from './_components/DeploymentNavbar';
import { DeploymentProvider } from './context';

export default function DeploymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DeploymentProvider>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deployment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage deployments and CI/CD integrations
          </p>
        </div>
        
        <DeploymentNavbar />
        
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </DeploymentProvider>
  );
} 