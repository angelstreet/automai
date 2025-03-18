// src/app/[locale]/[tenant]/deployment/constants.ts
import { Script, Host, ScriptParameter } from './types';

// Status configuration for the StatusBadge component
export const STATUS_CONFIG = {
  success: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: 'CheckCircle'
  },
  failed: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: 'XCircle'
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: 'Play'
  },
  pending: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: 'Clock'
  },
  scheduled: {
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: 'Calendar'
  },
  warning: {
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    icon: 'AlertTriangle'
  }
};

// Sample script parameters for script options
export const SCRIPT_PARAMETER_TYPES: ScriptParameter[] = [
  {
    id: 'env',
    name: 'Environment',
    description: 'Target environment',
    type: 'select',
    required: true,
    default: 'dev',
    options: ['dev', 'staging', 'production']
  },
  {
    id: 'skip_tests',
    name: 'Skip Tests',
    description: 'Skip running tests during deployment',
    type: 'boolean',
    required: false,
    default: false
  },
  {
    id: 'backup_path',
    name: 'Backup Path',
    description: 'Path to store backups',
    type: 'string',
    required: true,
    default: '/backups'
  },
  {
    id: 'timeout',
    name: 'Timeout',
    description: 'Operation timeout in seconds',
    type: 'number',
    required: false,
    default: 300
  }
];

// Sample scripts for the deployment wizard
export const SAMPLE_SCRIPTS: Script[] = [
  {
    id: 'script1',
    name: 'Deployment Script',
    path: '/scripts/deploy.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Environment',
        description: 'Target environment',
        type: 'select',
        required: true,
        default: 'dev',
        options: ['dev', 'staging', 'production']
      },
      {
        id: 'param2',
        name: 'Skip Tests',
        description: 'Skip running tests during deployment',
        type: 'boolean',
        required: false,
        default: false
      }
    ]
  },
  {
    id: 'script2',
    name: 'Backup Script',
    path: '/scripts/backup.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Backup Path',
        description: 'Path to store backups',
        type: 'string',
        required: true,
        default: '/backups'
      },
      {
        id: 'param2',
        name: 'Compression Level',
        description: 'Compression level (1-9)',
        type: 'number',
        required: false,
        default: 5
      }
    ]
  },
  {
    id: 'script3',
    name: 'Monitoring Script',
    path: '/scripts/monitor.sh',
    repository: 'main'
  },
];

// Sample hosts for the deployment wizard
export const SAMPLE_HOSTS: Host[] = [
  { id: 'host1', name: 'Production Server 1', environment: 'Production', status: 'online', ip: '192.168.1.10' },
  { id: 'host2', name: 'Production Server 2', environment: 'Production', status: 'online', ip: '192.168.1.11' },
  { id: 'host3', name: 'Staging Server', environment: 'Staging', status: 'online', ip: '192.168.2.10' },
  { id: 'host4', name: 'Development Server', environment: 'Development', status: 'online', ip: '192.168.3.10' },
];

// Sample Jenkins credentials
export const JENKINS_CREDENTIAL_OPTIONS = [
  { value: 'jenkins-prod', label: 'Jenkins Production' },
  { value: 'jenkins-staging', label: 'Jenkins Staging' },
  { value: 'jenkins-dev', label: 'Jenkins Development' },
];

// Sample Jenkins job options
export const JENKINS_JOB_OPTIONS = [
  { value: 'deploy-frontend', label: 'Deploy Frontend' },
  { value: 'deploy-backend', label: 'Deploy Backend' },
  { value: 'deploy-full-stack', label: 'Deploy Full Stack' },
  { value: 'run-tests', label: 'Run Integration Tests' },
];

// Initial deployment data structure
export const INITIAL_DEPLOYMENT_DATA = {
  name: '',
  description: '',
  repositoryId: '',
  scriptIds: [] as string[],
  scriptParameters: {} as Record<string, Record<string, any>>,
  hostIds: [] as string[],
  schedule: 'now' as 'now' | 'later',
  scheduledTime: '',
  environmentVars: [] as Array<{key: string, value: string}>,
  notifications: {
    email: false,
    slack: false
  },
  jenkinsConfig: {
    enabled: false,
    jenkinsUrl: '',
    jobName: '',
    credentials: '',
    customParameters: {}
  }
};

// Repository options
export const REPOSITORY_OPTIONS = [
  { value: 'repo1', label: 'Main Repository' },
  { value: 'repo2', label: 'Frontend Repository' },
  { value: 'repo3', label: 'Backend Repository' }
];