'use client';

import React, { useState } from 'react';
import { Calendar, Clock, FileText, Save } from 'lucide-react';
import { Project, Script, Host } from './types';
import ScriptSelector from './ScriptSelector';
import HostSelector from './HostSelector';

interface DeploymentFormProps {
  projects: Project[];
  allHosts: Host[];
  onSubmit: (formData: {
    name: string;
    projectId: string;
    description: string;
    scheduledTime: string | null;
    selectedScripts: string[];
    selectedHosts: string[];
  }) => void;
}

const DeploymentForm = ({ projects, allHosts, onSubmit }: DeploymentFormProps) => {
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  
  // Get selected project
  const selectedProject = projects.find(p => p.id.toString() === projectId);
  
  // Get scripts for selected project
  const availableScripts: Script[] = selectedProject?.scripts || [];
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      name,
      projectId,
      description,
      scheduledTime: scheduleType === 'later' ? scheduledTime : null,
      selectedScripts,
      selectedHosts,
    });
  };
  
  // Handle script selection/deselection
  const handleScriptToggle = (scriptId: string) => {
    setSelectedScripts(prev => 
      prev.includes(scriptId)
        ? prev.filter(id => id !== scriptId)
        : [...prev, scriptId]
    );
  };
  
  // Handle host selection/deselection
  const handleHostToggle = (hostId: string) => {
    setSelectedHosts(prev => 
      prev.includes(hostId)
        ? prev.filter(id => id !== hostId)
        : [...prev, hostId]
    );
  };
  
  // Validation
  const isFormValid = 
    name.trim() !== '' && 
    projectId !== '' && 
    selectedScripts.length > 0 && 
    selectedHosts.length > 0 &&
    (scheduleType === 'now' || (scheduledTime && new Date(scheduledTime) > new Date()));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Deployment Name
        </label>
        <input
          type="text"
          id="name"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter deployment name"
          required
        />
      </div>
      
      <div>
        <label htmlFor="project" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Project
        </label>
        <select
          id="project"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setSelectedScripts([]); // Reset selected scripts when project changes
          }}
          required
        >
          <option value="">Select a project</option>
          {projects.map(project => (
            <option key={project.id} value={project.id.toString()}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1 flex items-center text-gray-700 dark:text-gray-300">
          <FileText size={16} className="mr-1" />
          Description
        </label>
        <textarea
          id="description"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter deployment description"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScriptSelector
          availableScripts={availableScripts}
          selectedScripts={selectedScripts}
          onScriptToggle={handleScriptToggle}
          isProjectSelected={!!selectedProject}
        />
        
        <HostSelector
          availableHosts={allHosts}
          selectedHosts={selectedHosts}
          onHostToggle={handleHostToggle}
        />
      </div>
      
      <div>
        <div className="block text-sm font-medium mb-2 flex items-center text-gray-700 dark:text-gray-300">
          <Calendar size={16} className="mr-1" />
          Schedule
        </div>
        <div className="flex items-center space-x-4 mb-3">
          <label className="inline-flex items-center text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              className="form-radio text-blue-600"
              checked={scheduleType === 'now'}
              onChange={() => setScheduleType('now')}
            />
            <span className="ml-2">Deploy now</span>
          </label>
          <label className="inline-flex items-center text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              className="form-radio text-blue-600"
              checked={scheduleType === 'later'}
              onChange={() => setScheduleType('later')}
            />
            <span className="ml-2">Schedule for later</span>
          </label>
        </div>
        
        {scheduleType === 'later' && (
          <div className="flex items-center">
            <div className="relative flex-1">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
              <input
                type="datetime-local"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={scheduledTime || ''}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required={scheduleType === 'later'}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <button
          type="submit"
          className={`flex items-center justify-center w-full py-2 px-4 rounded-md text-white ${
            isFormValid
              ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
              : 'bg-blue-300 dark:bg-blue-800/50 cursor-not-allowed'
          }`}
          disabled={!isFormValid}
        >
          <Save size={16} className="mr-2" />
          {scheduleType === 'now' ? 'Deploy Now' : 'Schedule Deployment'}
        </button>
      </div>
    </form>
  );
};

export default DeploymentForm; 