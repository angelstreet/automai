import React, { useState, useEffect } from 'react';
import {
Plus, Edit, Trash2, Play, Pause, Calendar, Clock, ArrowRight,
FileCode, GitBranch, Package, ChevronDown, ChevronUp, Save,
RefreshCw, Copy, Check, Info
} from 'lucide-react';

// Sample data - in a real app, this would come from your backend
const sampleRepos = [
{ id: 1, name: 'data-processing', provider: 'GitHub', owner: 'user1', url: 'https://github.com/user1/data-processing' },
{ id: 2, name: 'api-automation', provider: 'GitLab', owner: 'user1', url: 'https://gitlab.com/user1/api-automation' },
{ id: 3, name: 'utils', provider: 'Gitea', owner: 'team-a', url: 'https://gitea.company.com/team-a/utils' },
{ id: 4, name: 'batch-jobs', provider: 'GitHub', owner: 'user1', url: 'https://github.com/user1/batch-jobs' },
{ id: 5, name: 'monitoring-scripts', provider: 'Gitea', owner: 'personal', url: 'https://gitea.personal-server.net/personal/monitoring-scripts' },
];

const sampleScripts = [
{ id: 1, name: 'process_data.py', repoId: 1, path: '/scripts/process_data.py', description: 'Processes raw data files and outputs CSV' },
{ id: 2, name: 'generate_report.py', repoId: 1, path: '/scripts/generate_report.py', description: 'Creates PDF reports from processed data' },
{ id: 3, name: 'fetch_api_data.js', repoId: 2, path: '/src/fetch_api_data.js', description: 'Fetches data from external APIs' },
{ id: 4, name: 'archive_logs.sh', repoId: 3, path: '/maintenance/archive_logs.sh', description: 'Archives and compresses log files' },
{ id: 5, name: 'daily_cleanup.py', repoId: 4, path: '/scheduled/daily_cleanup.py', description: 'Performs daily cleanup operations' },
{ id: 6, name: 'send_alerts.py', repoId: 5, path: '/alerting/send_alerts.py', description: 'Sends SMS and email alerts' },
{ id: 7, name: 'backup_db.py', repoId: 3, path: '/maintenance/backup_db.py', description: 'Creates database backups' },
];

const sampleProjects = [
{
id: 1,
name: 'Daily Data Processing',
description: 'Daily ETL workflow that processes data and generates reports',
lastRun: '2024-12-10 08:30',
status: 'active',
scheduleType: 'daily',
scheduleConfig: '08:00'
},
{
id: 2,
name: 'Weekly Maintenance',
description: 'Weekly maintenance tasks for database and logs',
lastRun: '2024-12-08 01:15',
status: 'active',
scheduleType: 'weekly',
scheduleConfig: 'Sunday 01:00'
},
{
id: 3,
name: 'Monthly Reports',
description: 'End-of-month reporting process',
lastRun: '2024-11-30 23:45',
status: 'inactive',
scheduleType: 'monthly',
scheduleConfig: 'Last day 23:00'
}
];

const sampleProjectScripts = [
{ id: 1, projectId: 1, scriptId: 1, order: 1, timeout: 1800, retries: 2, dependencies: [], env: {API_KEY: 'sample_key'} },
{ id: 2, projectId: 1, scriptId: 2, order: 2, timeout: 900, retries: 1, dependencies: [1], env: {OUTPUT_DIR: '/tmp/reports'} },
{ id: 3, projectId: 2, scriptId: 4, order: 1, timeout: 600, retries: 0, dependencies: [], env: {} },
{ id: 4, projectId: 2, scriptId: 7, order: 2, timeout: 1200, retries: 1, dependencies: [], env: {DB_PASSWORD: '**\*\***'} },
{ id: 5, projectId: 3, scriptId: 1, order: 1, timeout: 1800, retries: 0, dependencies: [], env: {} },
{ id: 6, projectId: 3, scriptId: 2, order: 2, timeout: 900, retries: 0, dependencies: [5], env: {} },
{ id: 7, projectId: 3, scriptId: 6, order: 3, timeout: 300, retries: 2, dependencies: [6], env: {ALERT_RECIPIENTS: 'team@example.com'} },
];

const sampleRuns = [
{ id: 1, projectId: 1, startTime: '2024-12-10 08:30', endTime: '2024-12-10 08:45', status: 'success', logs: {} },
{ id: 2, projectId: 1, startTime: '2024-12-09 08:30', endTime: '2024-12-09 08:47', status: 'success', logs: {} },
{ id: 3, projectId: 2, startTime: '2024-12-08 01:15', endTime: '2024-12-08 01:30', status: 'success', logs: {} },
{ id: 4, projectId: 3, startTime: '2024-11-30 23:45', endTime: '2024-12-01 00:10', status: 'partial', logs: {} },
{ id: 5, projectId: 1, startTime: '2024-12-08 08:30', endTime: '2024-12-08 08:33', status: 'failed', logs: {} },
];

// Main component
const ProjectCampaignManager = () => {
// State management
const [projects, setProjects] = useState(sampleProjects);
const [repos, setRepos] = useState(sampleRepos);
const [scripts, setScripts] = useState(sampleScripts);
const [projectScripts, setProjectScripts] = useState(sampleProjectScripts);
const [runs, setRuns] = useState(sampleRuns);

const [selectedProjectId, setSelectedProjectId] = useState(null);
const [showProjectModal, setShowProjectModal] = useState(false);
const [showScriptModal, setShowScriptModal] = useState(false);
const [editingProject, setEditingProject] = useState(null);
const [editingProjectScript, setEditingProjectScript] = useState(null);
const [expandedSection, setExpandedSection] = useState('project');

// Project form state
const [projectFormData, setProjectFormData] = useState({
name: '',
description: '',
scheduleType: 'manual',
scheduleConfig: '',
status: 'active'
});

// Project script form state
const [scriptFormData, setScriptFormData] = useState({
scriptId: '',
order: 1,
timeout: 3600,
retries: 0,
env: {}
});

// Environment variable form state
const [envVarKey, setEnvVarKey] = useState('');
const [envVarValue, setEnvVarValue] = useState('');

// Get a project by id
const getProject = (id) => projects.find(p => p.id === id);

// Get scripts for a project
const getProjectScripts = (projectId) => {
const pScripts = projectScripts.filter(ps => ps.projectId === projectId)
.sort((a, b) => a.order - b.order);

    return pScripts.map(ps => {
      const scriptDetails = scripts.find(s => s.id === ps.scriptId);
      const repoDetails = repos.find(r => r.id === scriptDetails?.repoId);

      return {
        ...ps,
        name: scriptDetails?.name,
        path: scriptDetails?.path,
        description: scriptDetails?.description,
        repoName: repoDetails?.name,
        repoProvider: repoDetails?.provider,
        repoOwner: repoDetails?.owner
      };
    });

};

// Get runs for a project
const getProjectRuns = (projectId) => {
return runs.filter(r => r.projectId === projectId)
.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
};

// Handle selecting a project
const handleSelectProject = (projectId) => {
setSelectedProjectId(projectId);
setExpandedSection('project');
};

// Handle creating/editing a project
const handleOpenProjectModal = (project = null) => {
if (project) {
setEditingProject(project);
setProjectFormData({
name: project.name,
description: project.description,
scheduleType: project.scheduleType,
scheduleConfig: project.scheduleConfig,
status: project.status
});
} else {
setEditingProject(null);
setProjectFormData({
name: '',
description: '',
scheduleType: 'manual',
scheduleConfig: '',
status: 'active'
});
}
setShowProjectModal(true);
};

// Handle saving a project
const handleSaveProject = () => {
if (editingProject) {
// Update existing project
setProjects(projects.map(p =>
p.id === editingProject.id
? { ...p, ...projectFormData, lastRun: p.lastRun }
: p
));
} else {
// Create new project
const newProject = {
...projectFormData,
id: Date.now(),
lastRun: 'Never'
};
setProjects([...projects, newProject]);
setSelectedProjectId(newProject.id);
}
setShowProjectModal(false);
};

// Handle deleting a project
const handleDeleteProject = (projectId) => {
if (confirm('Are you sure you want to delete this project? This will also delete all associated scripts and runs.')) {
setProjects(projects.filter(p => p.id !== projectId));
setProjectScripts(projectScripts.filter(ps => ps.projectId !== projectId));
setRuns(runs.filter(r => r.projectId !== projectId));

      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
    }

};

// Handle adding/editing a script
const handleOpenScriptModal = (projectScript = null) => {
if (projectScript) {
setEditingProjectScript(projectScript);
setScriptFormData({
scriptId: projectScript.scriptId,
order: projectScript.order,
timeout: projectScript.timeout,
retries: projectScript.retries,
env: { ...projectScript.env }
});
} else {
setEditingProjectScript(null);
setScriptFormData({
scriptId: '',
order: getProjectScripts(selectedProjectId).length + 1,
timeout: 3600,
retries: 0,
env: {}
});
}
setShowScriptModal(true);
};

// Handle saving a script
const handleSaveScript = () => {
const selectedProject = getProject(selectedProjectId);
if (!selectedProject) return;

    if (editingProjectScript) {
      // Update existing project script
      setProjectScripts(projectScripts.map(ps =>
        ps.id === editingProjectScript.id
          ? { ...ps, ...scriptFormData }
          : ps
      ));
    } else {
      // Create new project script
      const newProjectScript = {
        ...scriptFormData,
        id: Date.now(),
        projectId: selectedProjectId,
        dependencies: []
      };
      setProjectScripts([...projectScripts, newProjectScript]);
    }
    setShowScriptModal(false);

};

// Handle deleting a script from a project
const handleDeleteProjectScript = (projectScriptId) => {
if (confirm('Are you sure you want to remove this script from the project?')) {
setProjectScripts(projectScripts.filter(ps => ps.id !== projectScriptId));
}
};

// Handle adding an environment variable
const handleAddEnvVar = () => {
if (!envVarKey.trim()) return;

    setScriptFormData({
      ...scriptFormData,
      env: {
        ...scriptFormData.env,
        [envVarKey]: envVarValue
      }
    });

    setEnvVarKey('');
    setEnvVarValue('');

};

// Handle removing an environment variable
const handleRemoveEnvVar = (key) => {
const newEnv = { ...scriptFormData.env };
delete newEnv[key];

    setScriptFormData({
      ...scriptFormData,
      env: newEnv
    });

};

// Handle running a project now
const handleRunProject = (projectId) => {
const now = new Date();
const formattedDate = now.toISOString().slice(0, 10) + ' ' +
now.toTimeString().slice(0, 5);

    const newRun = {
      id: Date.now(),
      projectId,
      startTime: formattedDate,
      endTime: '',
      status: 'running',
      logs: {}
    };

    setRuns([newRun, ...runs]);

    // Simulate run completion after 3 seconds
    setTimeout(() => {
      const fiveMinLater = new Date(now.getTime() + 5 * 60000);
      const formattedEndDate = fiveMinLater.toISOString().slice(0, 10) + ' ' +
        fiveMinLater.toTimeString().slice(0, 5);

      setRuns(runs => runs.map(r =>
        r.id === newRun.id
          ? { ...r, endTime: formattedEndDate, status: 'success' }
          : r
      ));

      setProjects(projects => projects.map(p =>
        p.id === projectId
          ? { ...p, lastRun: formattedDate }
          : p
      ));
    }, 3000);

};

// Handle toggling project status
const handleToggleProjectStatus = (projectId) => {
setProjects(projects.map(p =>
p.id === projectId
? { ...p, status: p.status === 'active' ? 'inactive' : 'active' }
: p
));
};

// Handle duplicating a project
const handleDuplicateProject = (projectId) => {
const projectToDuplicate = getProject(projectId);
if (!projectToDuplicate) return;

    // Create new project with copy suffix
    const newProject = {
      ...projectToDuplicate,
      id: Date.now(),
      name: `${projectToDuplicate.name} (Copy)`,
      lastRun: 'Never',
      status: 'inactive'
    };

    setProjects([...projects, newProject]);

    // Duplicate all associated scripts
    const scriptsToDuplicate = projectScripts.filter(ps => ps.projectId === projectId);
    const newProjectScripts = scriptsToDuplicate.map(ps => ({
      ...ps,
      id: Date.now() + ps.id, // Ensure unique IDs
      projectId: newProject.id
    }));

    setProjectScripts([...projectScripts, ...newProjectScripts]);

    // Select the new project
    setSelectedProjectId(newProject.id);

};

// Project Modal Component
const ProjectModal = () => {
return (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
<div className="bg-white p-6 rounded-lg w-full max-w-md">
<h2 className="text-xl font-bold mb-4">
{editingProject ? 'Edit Project' : 'Create New Project'}
</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded p-2"
              value={projectFormData.name}
              onChange={(e) => setProjectFormData({...projectFormData, name: e.target.value})}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded p-2"
              value={projectFormData.description}
              onChange={(e) => setProjectFormData({...projectFormData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Schedule Type</label>
            <select
              className="w-full border border-gray-300 rounded p-2"
              value={projectFormData.scheduleType}
              onChange={(e) => setProjectFormData({...projectFormData, scheduleType: e.target.value})}
            >
              <option value="manual">Manual (No Schedule)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom (CRON)</option>
            </select>
          </div>

          {projectFormData.scheduleType !== 'manual' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {projectFormData.scheduleType === 'daily' ? 'Time (HH:MM)' :
                 projectFormData.scheduleType === 'weekly' ? 'Day and Time' :
                 projectFormData.scheduleType === 'monthly' ? 'Day and Time' :
                 'CRON Expression'}
              </label>
              <input
                type={projectFormData.scheduleType === 'daily' ? 'time' : 'text'}
                className="w-full border border-gray-300 rounded p-2"
                value={projectFormData.scheduleConfig}
                onChange={(e) => setProjectFormData({...projectFormData, scheduleConfig: e.target.value})}
                placeholder={
                  projectFormData.scheduleType === 'daily' ? '08:00' :
                  projectFormData.scheduleType === 'weekly' ? 'Monday 08:00' :
                  projectFormData.scheduleType === 'monthly' ? '1 08:00 (1st day at 8am)' :
                  '0 8 * * 1-5 (Weekdays at 8am)'
                }
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Status</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={projectFormData.status === 'active'}
                  onChange={() => setProjectFormData({...projectFormData, status: 'active'})}
                  className="mr-2"
                />
                Active
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={projectFormData.status === 'inactive'}
                  onChange={() => setProjectFormData({...projectFormData, status: 'inactive'})}
                  className="mr-2"
                />
                Inactive
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded"
              onClick={() => setShowProjectModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={handleSaveProject}
            >
              Save Project
            </button>
          </div>
        </div>
      </div>
    );

};

// Script Modal Component
const ScriptModal = () => {
return (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
<div className="bg-white p-6 rounded-lg w-full max-w-md max-h-screen overflow-y-auto">
<h2 className="text-xl font-bold mb-4">
{editingProjectScript ? 'Edit Script Configuration' : 'Add Script to Project'}
</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Script</label>
            <select
              className="w-full border border-gray-300 rounded p-2"
              value={scriptFormData.scriptId}
              onChange={(e) => setScriptFormData({...scriptFormData, scriptId: parseInt(e.target.value)})}
              required
              disabled={editingProjectScript !== null}
            >
              <option value="">Select a script...</option>
              {scripts.map(script => {
                const repo = repos.find(r => r.id === script.repoId);
                return (
                  <option key={script.id} value={script.id}>
                    {script.name} ({repo?.name})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Execution Order</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded p-2"
              value={scriptFormData.order}
              onChange={(e) => setScriptFormData({...scriptFormData, order: parseInt(e.target.value)})}
              min={1}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Timeout (seconds)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded p-2"
              value={scriptFormData.timeout}
              onChange={(e) => setScriptFormData({...scriptFormData, timeout: parseInt(e.target.value)})}
              min={0}
              required
            />
            <p className="text-xs text-gray-500 mt-1">0 = no timeout</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Retries on Failure</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded p-2"
              value={scriptFormData.retries}
              onChange={(e) => setScriptFormData({...scriptFormData, retries: parseInt(e.target.value)})}
              min={0}
              max={5}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Environment Variables</label>

            <div className="flex mb-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-l p-2"
                placeholder="KEY"
                value={envVarKey}
                onChange={(e) => setEnvVarKey(e.target.value)}
              />
              <input
                type="text"
                className="flex-1 border-t border-b border-r border-gray-300 p-2"
                placeholder="VALUE"
                value={envVarValue}
                onChange={(e) => setEnvVarValue(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-2 bg-blue-600 text-white rounded-r"
                onClick={handleAddEnvVar}
              >
                Add
              </button>
            </div>

            {Object.keys(scriptFormData.env).length === 0 ? (
              <p className="text-sm text-gray-500 italic">No environment variables set</p>
            ) : (
              <ul className="bg-gray-50 border border-gray-200 rounded-md divide-y divide-gray-200">
                {Object.entries(scriptFormData.env).map(([key, value]) => (
                  <li key={key} className="flex justify-between items-center p-2">
                    <div>
                      <span className="font-mono bg-gray-200 px-1 rounded text-sm">{key}</span>
                      <span className="mx-2">=</span>
                      <span className="font-mono text-sm">{value}</span>
                    </div>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleRemoveEnvVar(key)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded"
              onClick={() => setShowScriptModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={handleSaveScript}
              disabled={!scriptFormData.scriptId}
            >
              Save Script
            </button>
          </div>
        </div>
      </div>
    );

};

// Section toggle component
const SectionToggle = ({ title, section, icon: Icon }) => (
<button
className={`flex items-center justify-between w-full p-3 text-left ${
        expandedSection === section 
          ? 'bg-blue-50 border-blue-500 text-blue-700 border-l-2' 
          : 'hover:bg-gray-50'
      }`}
onClick={() => setExpandedSection(expandedSection === section ? null : section)} >
<div className="flex items-center">
<Icon size={18} className="mr-2" />
<span className="font-medium">{title}</span>
</div>
{expandedSection === section ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
</button>
);

return (
<div className="container mx-auto p-4 max-w-6xl">
<h1 className="text-2xl font-bold mb-6">Project & Campaign Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-1 border rounded-lg overflow-hidden">
          <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
            <h2 className="font-semibold">Projects</h2>
            <button
              className="p-1 text-blue-600 hover:text-blue-800"
              onClick={() => handleOpenProjectModal()}
              title="Create New Project"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-screen">
            {projects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No projects yet. Create your first project!
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {projects.map(project => (
                  <li
                    key={project.id}
                    className={`border-l-2 ${
                      selectedProjectId === project.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectProject(project.id)}
                  >
                    <div className="p-3 cursor-pointer">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{project.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Calendar size={12} className="mr-1" />
                        <span className="mr-2">Last run: {project.lastRun}</span>
                        {project.scheduleType !== 'manual' && (
                          <>
                            <Clock size={12} className="mr-1" />
                            <span>{project.scheduleType}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Project Details */}
        <div className="lg:col-span-3">
          {selectedProjectId ? (
            <>
              {/* Selected Project */}
              {(() => {
                const project = getProject(selectedProjectId);
                if (!project) return null;

                const projectScriptsList = getProjectScripts(selectedProjectId);
                const projectRunsList = getProjectRuns(selectedProjectId);

                return (
                  <div className="border rounded-lg overflow-hidden">
                    {/* Project Header */}
                    <div className="bg-gray-50 p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-xl font-semibold flex items-center">
                          {project.name}
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status}
                          </span>
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
                          onClick={() => handleRunProject(project.id)}
                        >
                          <Play size={14} className="mr-1" />
                          Run Now
                        </button>

                        <button
                          className="flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm"
                          onClick={() => handleToggleProjectStatus(project.id)}
                        >
                          {project.status === 'active' ? (
                            <>
                              <Pause size={14} className="mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Play size={14} className="mr-1" />
                              Enable
                            </>
                          )}
                        </button>

                        <div className="relative group">
                          <button
                            className="flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm"
                          >
                            More
                            <ChevronDown size={14} className="ml-1" />
                          </button>

                          <div className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10 hidden group-hover:block">
                            <ul className="py-1">
                              <li>
                                <button
                                  className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                                  onClick={() => handleOpenProjectModal(project)}
                                >
                                  <Edit size={14} className="mr-2" />
                                  Edit Project
                                </button>
                              </li>
                              <li>
                                <button
                                  className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                                  onClick={() => handleDuplicateProject(project.id)}
                                >
                                  <Copy size={14} className="mr-2" />
                                  Duplicate
                                </button>
                              </li>
                              <li>
                                <button
                                  className="flex items-center w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteProject(project.id)}
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Delete Project
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="grid grid-cols-3 gap-4 p-4 border-b bg-gray-50 text-sm">
                      <div>
                        <span className="text-gray-500 block">Schedule</span>
                        <span className="font-medium">
                          {project.scheduleType === 'manual'
                            ? 'Manual Only'
                            : `${project.scheduleType.charAt(0).toUpperCase() + project.scheduleType.slice(1)}: ${project.scheduleConfig}`
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Last Run</span>
                        <span className="font-medium">{project.lastRun}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Scripts</span>
                        <span className="font-medium">{projectScriptsList.length}</span>
                      </div>
                    </div>

                    {/* Sections */}
                    <div>
                      {/* Scripts Section */}
                      <div>
                        <SectionToggle title="Scripts & Execution Flow" section="scripts" icon={FileCode} />

                        {expandedSection === 'scripts' && (
                          <div className="p-4">
                            <div className="flex justify-between items-center mb-4">
                              <p className="text-sm text-gray-600">Configure the scripts that will run in this project and their execution order.</p>
                              <button
                                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
                                onClick={() => handleOpenScriptModal()}
                              >
                                <Plus size={14} className="mr-1" />
                                Add Script
                              </button>
                            </div>

                            {projectScriptsList.length === 0 ? (
                              <div className="text-center py-8 border rounded bg-gray-50">
                                <p className="text-gray-500">No scripts added to this project yet.</p>
                                <button
                                  className="mt-2 text-blue-600 hover:underline text-sm"
                                  onClick={() => handleOpenScriptModal()}
                                >
                                  Add your first script
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {projectScriptsList.map((ps, index) => (
                                  <div key={ps.id} className="border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                                      <div className="flex items-center">
                                        <span className="font-mono bg-gray-200 h-6 w-6 rounded-full flex items-center justify-center text-sm mr-2">
                                          {ps.order}
                                        </span>
                                        <h3 className="font-medium">{ps.name}</h3>
                                      </div>
                                      <div className="flex space-x-1">
                                        <button
                                          className="p-1 text-gray-500 hover:text-blue-600"
                                          onClick={() => handleOpenScriptModal(ps)}
                                          title="Edit Script Configuration"
                                        >
                                          <Edit size={16} />
                                        </button>
                                        <button
                                          className="p-1 text-gray-500 hover:text-red-600"
                                          onClick={() => handleDeleteProjectScript(ps.id)}
                                          title="Remove Script from Project"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="p-3">
                                      <div className="flex flex-wrap gap-y-2 text-sm">
                                        <div className="w-full sm:w-1/2">
                                          <span className="text-gray-500">Repository:</span>
                                          <span className="ml-1">{ps.repoName} ({ps.repoProvider})</span>
                                        </div>
                                        <div className="w-full sm:w-1/2">
                                          <span className="text-gray-500">Path:</span>
                                          <span className="ml-1 font-mono text-xs">{ps.path}</span>
                                        </div>
                                        <div className="w-full sm:w-1/2">
                                          <span className="text-gray-500">Timeout:</span>
                                          <span className="ml-1">{ps.timeout} seconds</span>
                                        </div>
                                        <div className="w-full sm:w-1/2">
                                          <span className="text-gray-500">Retries:</span>
                                          <span className="ml-1">{ps.retries}</span>
                                        </div>
                                      </div>

                                      {Object.keys(ps.env).length > 0 && (
                                        <div className="mt-2">
                                          <h4 className="text-xs font-medium text-gray-500 mb-1">Environment Variables</h4>
                                          <div className="bg-gray-50 p-2 rounded border text-xs font-mono">
                                            {Object.entries(ps.env).map(([key, value]) => (
                                              <div key={key}>
                                                <span className="text-blue-600">{key}</span>=
                                                <span className="text-green-600">"{value}"</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {index < projectScriptsList.length - 1 && (
                                        <div className="flex justify-center my-2">
                                          <ArrowRight size={20} className="text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Dependencies Section */}
                      <div>
                        <SectionToggle title="Dependencies & Packages" section="dependencies" icon={Package} />

                        {expandedSection === 'dependencies' && (
                          <div className="p-4">
                            <div className="flex justify-between items-center mb-4">
                              <p className="text-sm text-gray-600">Manage dependencies and packages required by this project.</p>
                            </div>

                            <div className="border rounded p-4 bg-gray-50 flex items-center justify-center">
                              <div className="text-center max-w-md">
                                <Info size={24} className="mx-auto mb-2 text-blue-500" />
                                <h3 className="font-medium mb-1">Dependencies Management</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                  Dependencies are managed at the project level and will be available to all scripts in the project.
                                </p>
                                <p className="text-sm italic text-gray-500">
                                  This feature will be implemented in the deployment page as mentioned.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Runs History Section */}
                      <div>
                        <SectionToggle title="Run History" section="runs" icon={RefreshCw} />

                        {expandedSection === 'runs' && (
                          <div className="p-4">
                            {projectRunsList.length === 0 ? (
                              <div className="text-center py-8 border rounded bg-gray-50">
                                <p className="text-gray-500">No run history for this project yet.</p>
                                <button
                                  className="mt-2 text-blue-600 hover:underline text-sm"
                                  onClick={() => handleRunProject(project.id)}
                                >
                                  Run project now
                                </button>
                              </div>
                            ) : (
                              <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {projectRunsList.map(run => {
                                      // Calculate duration
                                      let duration = '-';
                                      if (run.endTime) {
                                        const start = new Date(run.startTime);
                                        const end = new Date(run.endTime);
                                        const diff = (end - start) / 1000; // in seconds

                                        if (diff < 60) {
                                          duration = `${diff.toFixed(0)}s`;
                                        } else {
                                          const mins = Math.floor(diff / 60);
                                          const secs = Math.floor(diff % 60);
                                          duration = `${mins}m ${secs}s`;
                                        }
                                      }

                                      // Status badge class
                                      let statusClass = '';
                                      if (run.status === 'success') {
                                        statusClass = 'bg-green-100 text-green-800';
                                      } else if (run.status === 'running') {
                                        statusClass = 'bg-blue-100 text-blue-800';
                                      } else if (run.status === 'failed') {
                                        statusClass = 'bg-red-100 text-red-800';
                                      } else {
                                        statusClass = 'bg-yellow-100 text-yellow-800';
                                      }

                                      return (
                                        <tr key={run.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-sm">{run.startTime}</td>
                                          <td className="px-4 py-3 text-sm">{run.endTime || '-'}</td>
                                          <td className="px-4 py-3 text-sm">{duration}</td>
                                          <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>
                                              {run.status}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
