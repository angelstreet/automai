import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Activity, 
  FileText, 
  Link, 
  RefreshCw, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  ArrowRight,
  Code,
  GitBranch,
  X,
  Terminal,
  ExternalLink
} from 'lucide-react';

// Sample data for demonstration
const sampleProjects = [
  { 
    id: 1, 
    name: 'Daily Data Processing', 
    scripts: [
      { id: 1, name: 'process_data.py', path: '/scripts/process_data.py' },
      { id: 2, name: 'generate_report.py', path: '/scripts/generate_report.py' },
      { id: 3, name: 'fetch_api_data.js', path: '/src/fetch_api_data.js' }
    ]
  },
  { 
    id: 2, 
    name: 'Weekly Maintenance', 
    scripts: [
      { id: 4, name: 'archive_logs.sh', path: '/maintenance/archive_logs.sh' },
      { id: 5, name: 'backup_db.py', path: '/maintenance/backup_db.py' }
    ]
  },
  { 
    id: 3, 
    name: 'Monthly Reports', 
    scripts: [
      { id: 6, name: 'generate_monthly_report.py', path: '/reports/generate_monthly_report.py' },
      { id: 7, name: 'send_alerts.py', path: '/alerting/send_alerts.py' }
    ]
  }
];

const sampleHosts = [
  { id: 1, name: 'Production Web Server', ip: '192.168.1.10', environment: 'Production' },
  { id: 2, name: 'Production DB Server', ip: '192.168.1.11', environment: 'Production' },
  { id: 3, name: 'Staging Server', ip: '192.168.2.10', environment: 'Staging' },
  { id: 4, name: 'Dev Environment', ip: '192.168.3.10', environment: 'Development' },
  { id: 5, name: 'Test Server', ip: '192.168.3.11', environment: 'Testing' }
];

const sampleDeployments = [
  {
    id: 1,
    name: 'Daily ETL Process - March 3',
    projectName: 'Daily Data Processing',
    projectId: 1,
    status: 'success',
    createdBy: 'admin@example.com',
    startTime: '2025-03-03T08:00:00.000Z',
    endTime: '2025-03-03T08:15:30.000Z',
    scripts: [
      { id: 1, name: 'process_data.py', path: '/scripts/process_data.py', status: 'success', duration: '2m 10s' },
      { id: 2, name: 'generate_report.py', path: '/scripts/generate_report.py', status: 'success', duration: '5m 45s' }
    ],
    hosts: [
      { id: 1, name: 'Production Web Server', ip: '192.168.1.10', environment: 'Production' }
    ],
    logs: [
      { timestamp: '2025-03-03T08:00:00.000Z', level: 'INFO', message: 'Deployment started' },
      { timestamp: '2025-03-03T08:00:05.000Z', level: 'INFO', message: 'Cloning repository' },
      { timestamp: '2025-03-03T08:00:30.000Z', level: 'INFO', message: 'Running process_data.py' },
      { timestamp: '2025-03-03T08:02:40.000Z', level: 'INFO', message: 'process_data.py completed successfully' },
      { timestamp: '2025-03-03T08:02:45.000Z', level: 'INFO', message: 'Running generate_report.py' },
      { timestamp: '2025-03-03T08:08:30.000Z', level: 'INFO', message: 'generate_report.py completed successfully' },
      { timestamp: '2025-03-03T08:15:30.000Z', level: 'INFO', message: 'Deployment completed successfully' }
    ]
  },
  {
    id: 2,
    name: 'Weekly Maintenance - March 2',
    projectName: 'Weekly Maintenance',
    projectId: 2,
    status: 'failed',
    createdBy: 'admin@example.com',
    startTime: '2025-03-02T01:00:00.000Z',
    endTime: '2025-03-02T01:25:10.000Z',
    scripts: [
      { id: 4, name: 'archive_logs.sh', path: '/maintenance/archive_logs.sh', status: 'success', duration: '1m 30s' },
      { id: 5, name: 'backup_db.py', path: '/maintenance/backup_db.py', status: 'failed', duration: '10m 40s' }
    ],
    hosts: [
      { id: 2, name: 'Production DB Server', ip: '192.168.1.11', environment: 'Production' }
    ],
    logs: [
      { timestamp: '2025-03-02T01:00:00.000Z', level: 'INFO', message: 'Deployment started' },
      { timestamp: '2025-03-02T01:00:15.000Z', level: 'INFO', message: 'Running archive_logs.sh' },
      { timestamp: '2025-03-02T01:01:45.000Z', level: 'INFO', message: 'archive_logs.sh completed successfully' },
      { timestamp: '2025-03-02T01:02:00.000Z', level: 'INFO', message: 'Running backup_db.py' },
      { timestamp: '2025-03-02T01:12:40.000Z', level: 'ERROR', message: 'Database connection timed out' },
      { timestamp: '2025-03-02T01:12:50.000Z', level: 'ERROR', message: 'backup_db.py failed with exit code 1' },
      { timestamp: '2025-03-02T01:13:00.000Z', level: 'ERROR', message: 'Deployment failed' }
    ]
  },
  {
    id: 3,
    name: 'Monthly Reports - March 1',
    projectName: 'Monthly Reports',
    projectId: 3,
    status: 'in_progress',
    createdBy: 'admin@example.com',
    startTime: '2025-03-01T23:00:00.000Z',
    endTime: null,
    scripts: [
      { id: 6, name: 'generate_monthly_report.py', path: '/reports/generate_monthly_report.py', status: 'in_progress', duration: '10m' },
      { id: 7, name: 'send_alerts.py', path: '/alerting/send_alerts.py', status: 'pending', duration: null }
    ],
    hosts: [
      { id: 3, name: 'Staging Server', ip: '192.168.2.10', environment: 'Staging' }
    ],
    logs: [
      { timestamp: '2025-03-01T23:00:00.000Z', level: 'INFO', message: 'Deployment started' },
      { timestamp: '2025-03-01T23:00:15.000Z', level: 'INFO', message: 'Running generate_monthly_report.py' }
    ]
  },
  {
    id: 4,
    name: 'Test Deployment - Feb 29',
    projectName: 'Daily Data Processing',
    projectId: 1,
    status: 'pending',
    createdBy: 'admin@example.com',
    scheduledTime: '2025-03-04T08:00:00.000Z',
    startTime: null,
    endTime: null,
    scripts: [
      { id: 1, name: 'process_data.py', path: '/scripts/process_data.py', status: 'pending', duration: null },
      { id: 3, name: 'fetch_api_data.js', path: '/src/fetch_api_data.js', status: 'pending', duration: null }
    ],
    hosts: [
      { id: 4, name: 'Dev Environment', ip: '192.168.3.10', environment: 'Development' }
    ],
    logs: []
  }
];

// Status Badge component
const StatusBadge = ({ status }) => {
  let bgColor, textColor, Icon;
  
  switch (status) {
    case 'success':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      Icon = CheckCircle;
      break;
    case 'failed':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      Icon = XCircle;
      break;
    case 'in_progress':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      Icon = RefreshCw;
      break;
    case 'pending':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      Icon = Clock;
      break;
    default:
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      Icon = AlertCircle;
  }
  
  return (
    <span className={`flex items-center px-2 py-1 rounded-full text-xs ${bgColor} ${textColor}`}>
      <Icon size={14} className={`mr-1 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
    </span>
  );
};

// Deployment Details Modal
const DeploymentDetailsModal = ({ deployment, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };
  
  // Render log entry with appropriate styling
  const renderLogEntry = (log) => {
    let textColor = 'text-gray-700';
    if (log.level === 'ERROR') textColor = 'text-red-600';
    else if (log.level === 'WARNING') textColor = 'text-yellow-600';
    else if (log.level === 'INFO') textColor = 'text-blue-600';
    
    return (
      <div key={log.timestamp} className="py-1 border-b last:border-b-0">
        <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
        <span className={`ml-2 text-xs font-medium ${textColor}`}>[{log.level}]</span>
        <span className="ml-2 text-sm">{log.message}</span>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{deployment.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Project: {deployment.projectName} • Deployment ID: {deployment.id}
            </p>
          </div>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-6 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-6 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('logs')}
            >
              Logs
            </button>
            <button
              className={`px-6 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Deployment Info */}
              <div>
                <h3 className="text-lg font-medium mb-3">Deployment Information</h3>
                <div className="bg-gray-50 border rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <div className="font-medium mt-1">
                        <StatusBadge status={deployment.status} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created By</p>
                      <p className="font-medium mt-1">{deployment.createdBy || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Started At</p>
                      <p className="font-medium mt-1">{formatDate(deployment.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completed At</p>
                      <p className="font-medium mt-1">{formatDate(deployment.endTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium mt-1">
                        {deployment.endTime && deployment.startTime 
                          ? (function() {
                              const start = new Date(deployment.startTime);
                              const end = new Date(deployment.endTime);
                              const durationMs = end - start;
                              
                              const seconds = Math.floor(durationMs / 1000) % 60;
                              const minutes = Math.floor(durationMs / 1000 / 60) % 60;
                              const hours = Math.floor(durationMs / 1000 / 60 / 60);
                              
                              return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
                            })()
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Jenkins Job</p>
                      <p className="font-medium mt-1 flex items-center">
                        <a href="#" className="text-blue-600 hover:underline flex items-center">
                          View in Jenkins
                          <ExternalLink size={14} className="ml-1" />
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Scripts */}
              <div>
                <h3 className="text-lg font-medium mb-3">Scripts</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {deployment.scripts.map(script => (
                        <tr key={script.id}>
                          <td className="px-4 py-3 text-sm font-medium">{script.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{script.path}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={script.status} />
                          </td>
                          <td className="px-4 py-3 text-sm">{script.duration || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Target Hosts */}
              <div>
                <h3 className="text-lg font-medium mb-3">Target Hosts</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Environment</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {deployment.hosts.map(host => (
                        <tr key={host.id}>
                          <td className="px-4 py-3 text-sm font-medium">{host.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{host.ip}</td>
                          <td className="px-4 py-3 text-sm">{host.environment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'logs' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Deployment Logs</h3>
                <button className="px-3 py-1.5 border border-gray-300 rounded text-sm flex items-center">
                  <Download size={14} className="mr-1" />
                  Download Logs
                </button>
              </div>
              
              <div className="bg-gray-50 border rounded-md p-4 font-mono text-sm overflow-auto max-h-[500px]">
                {deployment.logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No logs available</p>
                ) : (
                  <div className="space-y-1">
                    {deployment.logs.map(log => renderLogEntry(log))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'results' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Deployment Results</h3>
                <button className="px-3 py-1.5 border border-gray-300 rounded text-sm flex items-center">
                  <Download size={14} className="mr-1" />
                  Download Report
                </button>
              </div>
              
              {deployment.status === 'pending' || deployment.status === 'in_progress' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-center">
                  <p className="text-yellow-600">
                    Deployment is still in progress. Results will be available once completed.
                  </p>
                </div>
              ) : deployment.status === 'failed' ? (
                <div>
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    <h4 className="font-medium text-red-700 mb-2">Deployment Failed</h4>
                    <p className="text-red-600">
                      The deployment failed during execution of <strong>{deployment.scripts.find(s => s.status === 'failed')?.name}</strong>.
                      Please check the logs for more details.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 border rounded-md p-4">
                    <h4 className="font-medium mb-2">Summary</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Started: {formatDate(deployment.startTime)}</li>
                      <li>Failed: {formatDate(deployment.endTime)}</li>
                      <li>
                        Scripts: {deployment.scripts.filter(s => s.status === 'success').length} successful,
                        {' '}{deployment.scripts.filter(s => s.status === 'failed').length} failed,
                        {' '}{deployment.scripts.filter(s => s.status === 'pending').length} not executed
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <h4 className="font-medium text-green-700 mb-2">Deployment Successful</h4>
                    <p className="text-green-600">
                      All scripts were executed successfully on the target hosts.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 border rounded-md p-4">
                    <h4 className="font-medium mb-2">Summary</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Started: {formatDate(deployment.startTime)}</li>
                      <li>Completed: {formatDate(deployment.endTime)}</li>
                      <li>
                        Scripts: {deployment.scripts.length} executed successfully
                      </li>
                      <li>
                        Total Duration: {(function() {
                          const start = new Date(deployment.startTime);
                          const end = new Date(deployment.endTime);
                          const durationMs = end - start;
                              
                          const seconds = Math.floor(durationMs / 1000) % 60;
                          const minutes = Math.floor(durationMs / 1000 / 60) % 60;
                          const hours = Math.floor(durationMs / 1000 / 60 / 60);
                              
                          return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
                        })()}
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="px-6 py-4 border-t flex justify-end">
          <button
            className="px-4 py-2 border border-gray-300 rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Deployment View Component
const DeploymentView = () => {
  // State management
  const [projects, setProjects] = useState(sampleProjects);
  const [hosts, setHosts] = useState(sampleHosts);
  const [deployments, setDeployments] = useState(sampleDeployments);
  const [activeDeployments, setActiveDeployments] = useState(0);
  const [totalDeployments, setTotalDeployments] = useState(0);
  
  // Form state
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedScripts, setSelectedScripts] = useState([]);
  const [selectedHosts, setSelectedHosts] = useState([]);
  const [deploymentName, setDeploymentName] = useState('');
  const [deploymentDescription, setDeploymentDescription] = useState('');
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  
  // UI state
  const [expandedDeploymentId, setExpandedDeploymentId] = useState(null);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState(null);
  const [formIsOpen, setFormIsOpen] = useState(false);
  
  // Available scripts for selected project
  const [availableScripts, setAvailableScripts] = useState([]);
  
  // Calculate active deployments count
  useEffect(() => {
    const active = deployments.filter(d => d.status === 'in_progress' || d.status === 'pending').length;
    setActiveDeployments(active);
    setTotalDeployments(deployments.length);
  }, [deployments]);
  
  // Update available scripts when project selection changes
  useEffect(() => {
    if (selectedProject) {
      const project = projects.find(p => p.id === parseInt(selectedProject));
      if (project && project.scripts) {
        setAvailableScripts(project.scripts);
      } else {
        setAvailableScripts([]);
      }
      setSelectedScripts([]);
    } else {
      setAvailableScripts([]);
    }
  }, [selectedProject, projects]);
  
  // Toggle deployment details expansion
  const toggleDeploymentDetails = (deploymentId) => {
    setExpandedDeploymentId(expandedDeploymentId === deploymentId ? null : deploymentId);
  };
  
  // View deployment details
  const viewDeploymentDetails = (deploymentId) => {
    setSelectedDeploymentId(deploymentId);
  };
  
  // Close deployment details modal
  const closeDeploymentDetails = () => {
    setSelectedDeploymentId(null);
  };
  
  // Handle script selection toggle
  const handleScriptToggle = (scriptId) => {
    setSelectedScripts(prev => 
      prev.includes(scriptId)
        ? prev.filter(id => id !== scriptId)
        : [...prev, scriptId]
    );
  };
  
  // Handle host selection toggle
  const handleHostToggle = (hostId) => {
    setSelectedHosts(prev => 
      prev.includes(hostId)
        ? prev.filter(id => id !== hostId)
        : [...prev, hostId]
    );
  };
  
  // Create new deployment
  const handleCreateDeployment = (e) => {
    e.preventDefault();
    
    if (!selectedProject || selectedScripts.length === 0 || selectedHosts.length === 0) {
      alert('Please select a project, at least one script, and at least one host');
      return;
    }
    
    const project = projects.find(p => p.id === parseInt(selectedProject));
    
    const newDeployment = {
      id: deployments.length + 1,
      name: deploymentName || `${project.name} - ${new Date().toLocaleDateString()}`,
      projectName: project.name,
      projectId: parseInt(selectedProject),
      status: scheduleType === 'immediate' ? 'in_progress' : 'pending',
      createdBy: 'admin@example.com',
      scheduledTime: scheduleType === 'scheduled' ? new Date(scheduleDateTime).toISOString() : null,
      startTime: scheduleType === 'immediate' ? new Date().toISOString() : null,
      endTime: null,
      scripts: selectedScripts.map(id => {
        const scriptObj = project.scripts.find(s => s.id === parseInt(id));
        return {
          id: parseInt(id),
          name: scriptObj.name,
          path: scriptObj.path,
          status: scheduleType === 'immediate' ? 'in_progress' : 'pending',
          duration: null
        };
      }),
      hosts: selectedHosts.map(id => {
        const hostObj = hosts.find(h => h.id === parseInt(id));
        return {
          id: parseInt(id),
          name: hostObj.name,
          ip: hostObj.ip,
          environment: hostObj.environment
        };
      }),
      logs: scheduleType === 'immediate' 
        ? [{ timestamp: new Date().toISOString(), level: 'INFO', message: 'Deployment started' }]
        : []
    };
    
    setDeployments([newDeployment, ...deployments]);
    
    // Reset form
    setSelectedProject('');
// Reset form
    setSelectedProject('');
    setSelectedScripts([]);
    setSelectedHosts([]);
    setDeploymentName('');
    setDeploymentDescription('');
    setScheduleType('immediate');
    setScheduleDateTime('');
    
    // Close form
    setFormIsOpen(false);
    
    // Simulate Jenkins job completion after a random time
    if (scheduleType === 'immediate') {
      const randomTime = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
      setTimeout(() => {
        const updatedDeployment = {
          ...newDeployment,
          status: Math.random() > 0.8 ? 'failed' : 'success', // 20% chance of failure
          endTime: new Date(new Date().getTime() + randomTime).toISOString(),
          scripts: newDeployment.scripts.map(script => {
            const shouldFail = Math.random() > 0.9; // 10% chance of script failure
            return {
              ...script,
              status: shouldFail ? 'failed' : 'success',
              duration: `${Math.floor(Math.random() * 5) + 1}m ${Math.floor(Math.random() * 50) + 10}s`
            };
          })
        };
        
        // If any script failed, mark deployment as failed
        if (updatedDeployment.scripts.some(s => s.status === 'failed')) {
          updatedDeployment.status = 'failed';
        }
        
        // Add completion log
        updatedDeployment.logs = [
          ...updatedDeployment.logs,
          { timestamp: new Date().toISOString(), level: 'INFO', message: 'Cloning repository' },
          ...updatedDeployment.scripts.flatMap(script => [
            { timestamp: new Date().toISOString(), level: 'INFO', message: `Running ${script.name}` },
            { 
              timestamp: new Date(new Date().getTime() + Math.random() * 2000).toISOString(), 
              level: script.status === 'failed' ? 'ERROR' : 'INFO', 
              message: script.status === 'failed' 
                ? `${script.name} failed with exit code 1` 
                : `${script.name} completed successfully` 
            }
          ]),
          { 
            timestamp: updatedDeployment.endTime, 
            level: updatedDeployment.status === 'failed' ? 'ERROR' : 'INFO', 
            message: updatedDeployment.status === 'failed' 
              ? 'Deployment failed' 
              : 'Deployment completed successfully' 
          }
        ];
        
        setDeployments(prev => 
          prev.map(d => d.id === newDeployment.id ? updatedDeployment : d)
        );
      }, randomTime);
    }
  };
  
  // Refresh deployments
  const refreshDeployments = () => {
    // In a real application, this would fetch the latest deployments from the API
    console.log('Refreshing deployments...');
  };
  
  // Navigate to projects page
  const navigateToProjectPage = () => {
    // In a real application, this would navigate to the projects page
    console.log('Navigating to projects page...');
  };
  
  // Cancel deployment
  const handleCancelDeployment = (deploymentId) => {
    if (confirm('Are you sure you want to cancel this deployment?')) {
      setDeployments(prev => 
        prev.map(d => d.id === deploymentId
          ? { ...d, status: 'cancelled', endTime: new Date().toISOString() }
          : d
        )
      );
    }
  };
  
  // Rerun deployment
  const handleRerunDeployment = (deploymentId) => {
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) return;
    
    const newDeployment = {
      ...deployment,
      id: deployments.length + 1,
      name: `${deployment.name} (Rerun)`,
      status: 'in_progress',
      startTime: new Date().toISOString(),
      endTime: null,
      scripts: deployment.scripts.map(script => ({
        ...script,
        status: 'in_progress',
        duration: null
      })),
      logs: [
        { timestamp: new Date().toISOString(), level: 'INFO', message: 'Deployment started' }
      ]
    };
    
    setDeployments([newDeployment, ...deployments]);
    
    // Simulate Jenkins job
    const randomTime = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
    setTimeout(() => {
      const updatedDeployment = {
        ...newDeployment,
        status: Math.random() > 0.8 ? 'failed' : 'success', // 20% chance of failure
        endTime: new Date(new Date().getTime() + randomTime).toISOString(),
        scripts: newDeployment.scripts.map(script => {
          const shouldFail = Math.random() > 0.9; // 10% chance of script failure
          return {
            ...script,
            status: shouldFail ? 'failed' : 'success',
            duration: `${Math.floor(Math.random() * 5) + 1}m ${Math.floor(Math.random() * 50) + 10}s`
          };
        })
      };
      
      // If any script failed, mark deployment as failed
      if (updatedDeployment.scripts.some(s => s.status === 'failed')) {
        updatedDeployment.status = 'failed';
      }
      
      // Add completion log
      updatedDeployment.logs = [
        ...updatedDeployment.logs,
        { timestamp: new Date().toISOString(), level: 'INFO', message: 'Cloning repository' },
        ...updatedDeployment.scripts.flatMap(script => [
          { timestamp: new Date().toISOString(), level: 'INFO', message: `Running ${script.name}` },
          { 
            timestamp: new Date(new Date().getTime() + Math.random() * 2000).toISOString(), 
            level: script.status === 'failed' ? 'ERROR' : 'INFO', 
            message: script.status === 'failed' 
              ? `${script.name} failed with exit code 1` 
              : `${script.name} completed successfully` 
          }
        ]),
        { 
          timestamp: updatedDeployment.endTime, 
          level: updatedDeployment.status === 'failed' ? 'ERROR' : 'INFO', 
          message: updatedDeployment.status === 'failed' 
            ? 'Deployment failed' 
            : 'Deployment completed successfully' 
        }
      ];
      
      setDeployments(prev => 
        prev.map(d => d.id === newDeployment.id ? updatedDeployment : d)
      );
    }, randomTime);
  };
  
  // Download report
  const handleDownloadReport = (deploymentId) => {
    alert(`Downloading report for deployment ${deploymentId}...`);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Get selected deployment
  const selectedDeployment = selectedDeploymentId 
    ? deployments.find(d => d.id === selectedDeploymentId) 
    : null;
  
  return (
    <div className="bg-gray-100 min-h-screen pb-10">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto p-4 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                Deployment Management
                <button 
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  onClick={navigateToProjectPage}
                  title="Go to Projects Page"
                >
                  <Link size={16} />
                </button>
              </h1>
              <p className="text-gray-600 mt-1">
                Deploy and run scripts from your repositories to target environments
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md">
                  <Activity size={16} className="mr-2" />
                  <span>Active: <strong>{activeDeployments}</strong></span>
                </div>
                <div className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md">
                  <FileText size={16} className="mr-2" />
                  <span>Total: <strong>{totalDeployments}</strong></span>
                </div>
                <button 
                  className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={refreshDeployments}
                  title="Refresh Deployments"
                >
                  <RefreshCw size={16} className="mr-1" />
                  Refresh
                </button>
              </div>
              
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
                onClick={() => setFormIsOpen(!formIsOpen)}
              >
                {formIsOpen ? 'Cancel' : 'New Deployment'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Deployment Form */}
        {formIsOpen && (
          <div className="mb-6 bg-white border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h2 className="font-semibold">Create New Deployment</h2>
            </div>
            
            <form onSubmit={handleCreateDeployment} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Deployment Name (optional)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded p-2"
                    value={deploymentName}
                    onChange={(e) => setDeploymentName(e.target.value)}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Project</label>
                  <select
                    className="w-full border border-gray-300 rounded p-2"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    required
                  >
                    <option value="">Select a project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  className="w-full border border-gray-300 rounded p-2"
                  value={deploymentDescription}
                  onChange={(e) => setDeploymentDescription(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                {/* Scripts Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <Code size={16} className="mr-1" />
                    Scripts to Deploy
                  </label>
                  
                  {!selectedProject ? (
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50 text-center text-sm text-gray-500">
                      Select a project to see available scripts
                    </div>
                  ) : availableScripts.length === 0 ? (
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50 text-center text-sm text-gray-500">
                      No scripts available for this project
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        {availableScripts.map(script => (
                          <div 
                            key={script.id} 
                            className="flex items-center px-3 py-2 border-b last:border-b-0 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              id={`script-${script.id}`}
                              checked={selectedScripts.includes(script.id.toString())}
                              onChange={() => handleScriptToggle(script.id.toString())}
                              className="mr-2"
                            />
                            <label htmlFor={`script-${script.id}`} className="flex-1 cursor-pointer">
                              <div className="font-medium text-sm">{script.name}</div>
                              <div className="text-xs text-gray-500 truncate">{script.path}</div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Hosts Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <Server size={16} className="mr-1" />
                    Target Hosts
                  </label>
                  
                  {hosts.length === 0 ? (
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50 text-center text-sm text-gray-500">
                      No hosts available
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        {hosts.map(host => (
                          <div 
                            key={host.id} 
                            className="flex items-center px-3 py-2 border-b last:border-b-0 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              id={`host-${host.id}`}
                              checked={selectedHosts.includes(host.id.toString())}
                              onChange={() => handleHostToggle(host.id.toString())}
                              className="mr-2"
                            />
                            <label htmlFor={`host-${host.id}`} className="flex-1 cursor-pointer">
                              <div className="font-medium text-sm">{host.name}</div>
                              <div className="text-xs text-gray-500">{host.ip} - {host.environment}</div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Schedule Options */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 flex items-center">
                  <Clock size={16} className="mr-1" />
                  Deployment Schedule
                </label>
                
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="scheduleType"
                      value="immediate"
                      checked={scheduleType === 'immediate'}
                      onChange={() => setScheduleType('immediate')}
                      className="mr-2"
                    />
                    Deploy Immediately
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="scheduleType"
                      value="scheduled"
                      checked={scheduleType === 'scheduled'}
                      onChange={() => setScheduleType('scheduled')}
                      className="mr-2"
                    />
                    Schedule Deployment
                  </label>
                </div>
                
                {scheduleType === 'scheduled' && (
                  <div className="mt-2">
                    <input
                      type="datetime-local"
                      className="border border-gray-300 rounded p-2"
                      value={scheduleDateTime}
                      onChange={(e) => setScheduleDateTime(e.target.value)}
                      required={scheduleType === 'scheduled'}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
                  disabled={!selectedProject || selectedScripts.length === 0 || selectedHosts.length === 0}
                >
                  Create Deployment
                  <ArrowRight size={16} className="ml-1" />
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Deployment List */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h2 className="font-semibold">Deployment History</h2>
          </div>
          
          {deployments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No deployments found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {deployments.map(deployment => (
                <div key={deployment.id} className="hover:bg-gray-50">
                  <div 
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer"
                    onClick={() => toggleDeploymentDetails(deployment.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <h3 className="font-medium">{deployment.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Project: {deployment.projectName} • 
                            <span className="ml-1">{deployment.scripts.length} scripts</span> •
                            <span className="ml-1">{deployment.hosts.length} hosts</span>
                          </p>
                        </div>
                        <StatusBadge status={deployment.status} />
                      </div>
                      
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Clock size={12} className="mr-1" />
                        {deployment.startTime 
                          ? `Started: ${formatDate(deployment.startTime)}` 
                          : `Scheduled: ${formatDate(deployment.scheduledTime)}`}
                        
                        {deployment.endTime && (
                          <span className="ml-3">
                            Finished: {formatDate(deployment.endTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center mt-2 sm:mt-0 sm:ml-4">
                      {expandedDeploymentId === deployment.id 
                        ? <ChevronUp size={20} className="text-gray-500" /> 
                        : <ChevronDown size={20} className="text-gray-500" />}
                    </div>
                  </div>
                  
                  {expandedDeploymentId === deployment.id && (
                    <div className="px-4 py-3 bg-gray-50 border-t">
                      {deployment.description && (
                        <p className="text-sm mb-3">{deployment.description}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Scripts</h4>
                          <ul className="border rounded-md overflow-hidden bg-white">
                            {deployment.scripts.map(script => (
                              <li key={script.id} className="px-3 py-2 border-b last:border-b-0 text-sm">
                                <div className="font-medium">{script.name}</div>
                                <div className="text-xs text-gray-500">{script.path}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Target Hosts</h4>
                          <ul className="border rounded-md overflow-hidden bg-white">
                            {deployment.hosts.map(host => (
                              <li key={host.id} className="px-3 py-2 border-b last:border-b-0 text-sm">
                                <div className="font-medium">{host.name}</div>
                                <div className="text-xs text-gray-500">{host.ip} - {host.environment}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <button
                          className="flex items-center px-3 py-1.5 border border-gray-300 bg-white rounded text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewDeploymentDetails(deployment.id);
                          }}
                        >
                          <Eye size={14} className="mr-1" />
                          View Details
                        </button>
                        
                        {deployment.status === 'success' || deployment.status === 'partial' || deployment.status === 'failed' ? (
                          <button
                            className="flex items-center px-3 py-1.5 border border-gray-300 bg-white rounded text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadReport(deployment.id);
                            }}
                          >
                            <Download size={14} className="mr-1" />
                            Download Report
                          </button>
                        ) : null}
                        
                        {deployment.status === 'in_progress' || deployment.status === 'pending' ? (
                          <button
                            className="flex items-center px-3 py-1.5 border border-red-300 bg-white text-red-600 rounded text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelDeployment(deployment.id);
                            }}
                          >
                            <Pause size={14} className="mr-1" />
                            Cancel
                          </button>
                        ) : (
                          <button
                            className="flex items-center px-3 py-1.5 border border-blue-300 bg-white text-blue-600 rounded text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRerunDeployment(deployment.id);
                            }}
                          >
                            <Play size={14} className="mr-1" />
                            Rerun
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Deployment Details Modal */}
      {selectedDeployment && (
        <DeploymentDetailsModal
          deployment={selectedDeployment}
          onClose={closeDeploymentDetails}
        />
      )}
    </div>
  );
};

export default DeploymentView;