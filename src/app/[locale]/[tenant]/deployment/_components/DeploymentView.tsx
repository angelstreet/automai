'use client';

import React, { useState } from 'react';
import { Plus, List } from 'lucide-react';
import DeploymentList from './DeploymentList';
import DeploymentForm from './DeploymentForm';
import DeploymentDetailsModal from './DeploymentDetailsModal';
import { Deployment } from './types';
import { sampleDeployments, sampleProjects, sampleHosts } from './data';

const DeploymentView = () => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [deployments, setDeployments] = useState<Deployment[]>(sampleDeployments);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);

  // Handle creation of a new deployment
  const handleDeploymentSubmit = (formData: {
    name: string;
    projectId: string;
    description: string;
    scheduledTime: string | null;
    selectedScripts: string[];
    selectedHosts: string[];
  }) => {
    // Find the selected project for reference
    const selectedProject = sampleProjects.find(p => p.id.toString() === formData.projectId);
    
    if (!selectedProject) {
      console.error('Selected project not found');
      return;
    }
    
    // Create a new deployment object
    const newDeployment: Deployment = {
      id: Date.now(),
      name: formData.name,
      projectName: selectedProject.name,
      projectId: selectedProject.id,
      status: formData.scheduledTime ? 'pending' : 'in_progress',
      createdBy: 'Current User', // In a real app, this would come from auth context
      description: formData.description,
      scheduledTime: formData.scheduledTime,
      startTime: formData.scheduledTime ? null : new Date().toISOString(),
      endTime: null,
      scripts: selectedProject.scripts.filter(script => 
        formData.selectedScripts.includes(script.id.toString())
      ),
      hosts: sampleHosts.filter(host => 
        formData.selectedHosts.includes(host.id.toString())
      ),
      logs: []
    };
    
    // Add the new deployment to the list
    setDeployments(prev => [newDeployment, ...prev]);
    
    // Switch back to list view
    setView('list');
  };

  // Handle selecting a deployment from the list
  const handleDeploymentSelect = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header with view toggle */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Deployments</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 flex items-center rounded-md ${
              view === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
            }`}
          >
            <List size={18} className="mr-1" />
            View Deployments
          </button>
          <button
            onClick={() => setView('form')}
            className={`px-4 py-2 flex items-center rounded-md ${
              view === 'form' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
            }`}
          >
            <Plus size={18} className="mr-1" />
            New Deployment
          </button>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {view === 'list' ? (
          <DeploymentList 
            deployments={deployments} 
            onDeploymentSelect={handleDeploymentSelect} 
          />
        ) : (
          <DeploymentForm 
            projects={sampleProjects}
            allHosts={sampleHosts}
            onSubmit={handleDeploymentSubmit}
          />
        )}
      </div>
      
      {/* Details modal */}
      {selectedDeployment && (
        <DeploymentDetailsModal
          deployment={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
        />
      )}
    </div>
  );
};

export default DeploymentView; 