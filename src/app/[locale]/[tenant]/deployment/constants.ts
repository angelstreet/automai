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
    description: 'Target environment (e.g., dev, staging, prod)',
    type: 'string',
    required: true,
    default: 'dev'
  },
  {
    id: 'flags',
    name: 'Script Flags',
    description: 'Flags to pass to the script',
    type: 'string',
    required: false,
    default: '--verbose'
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
    type: 'string',
    required: false,
    default: '300'
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
        name: 'Environment Variable',
        description: 'Target environment variable (e.g., dev, staging, prod)',
        type: 'string',
        required: true,
        default: 'dev'
      },
      {
        id: 'param2',
        name: 'Additional Arguments',
        description: 'Any additional arguments for the script',
        type: 'string',
        required: false,
        default: ''
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
        name: 'Compression Options',
        description: 'Any compression options',
        type: 'string',
        required: false,
        default: '--compress'
      }
    ]
  },
  {
    id: 'script3',
    name: 'Monitoring Script',
    path: '/scripts/monitor.sh',
    repository: 'main'
  },
  {
    id: 'script4',
    name: 'Database Migration',
    path: '/db/migrate.sql',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Database Name',
        description: 'Target database name',
        type: 'string',
        required: true,
        default: 'app_db'
      }
    ]
  },
  {
    id: 'script5',
    name: 'Frontend Build',
    path: '/frontend/build.js',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Build Mode',
        description: 'Build mode (production/development)',
        type: 'string',
        required: true,
        default: 'production'
      }
    ]
  },
  {
    id: 'script6',
    name: 'API Tests',
    path: '/tests/api/run_tests.sh',
    repository: 'main'
  },
  {
    id: 'script7',
    name: 'UI Tests',
    path: '/tests/ui/run_tests.sh',
    repository: 'main'
  },
  {
    id: 'script8',
    name: 'Security Scan',
    path: '/security/scan.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Scan Level',
        description: 'Security scan level (basic/advanced)',
        type: 'string',
        required: true,
        default: 'basic'
      }
    ]
  },
  {
    id: 'script9',
    name: 'Dependency Check',
    path: '/utils/check_deps.sh',
    repository: 'main'
  },
  {
    id: 'script10',
    name: 'Config Update',
    path: '/config/update.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Config Path',
        description: 'Path to config file',
        type: 'string',
        required: true,
        default: '/etc/config.json'
      }
    ]
  },
  {
    id: 'script11',
    name: 'Cache Cleanup',
    path: '/maintenance/clean_cache.sh',
    repository: 'main'
  },
  {
    id: 'script12',
    name: 'Log Rotation',
    path: '/maintenance/rotate_logs.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Max Size',
        description: 'Maximum log size in MB',
        type: 'string',
        required: true,
        default: '100'
      }
    ]
  },
  {
    id: 'script13',
    name: 'Service Restart',
    path: '/services/restart.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Service Name',
        description: 'Name of service to restart',
        type: 'string',
        required: true,
        default: 'app'
      }
    ]
  },
  {
    id: 'script14',
    name: 'Health Check',
    path: '/monitoring/health_check.sh',
    repository: 'main'
  },
  {
    id: 'script15',
    name: 'Analytics Export',
    path: '/analytics/export.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Format',
        description: 'Export format (csv/json)',
        type: 'string',
        required: true,
        default: 'csv'
      }
    ]
  },
  {
    id: 'script16',
    name: 'Email Notifications',
    path: '/notifications/email_send.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Template',
        description: 'Email template to use',
        type: 'string',
        required: true,
        default: 'deployment'
      }
    ]
  },
  {
    id: 'script17',
    name: 'Slack Notifications',
    path: '/notifications/slack_send.sh',
    repository: 'main'
  },
  {
    id: 'script18',
    name: 'Performance Tests',
    path: '/tests/performance/run.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Concurrent Users',
        description: 'Number of concurrent users to simulate',
        type: 'string',
        required: true,
        default: '100'
      }
    ]
  },
  {
    id: 'script19',
    name: 'Backup Verification',
    path: '/backup/verify.sh',
    repository: 'main',
    parameters: [
      {
        id: 'param1',
        name: 'Backup ID',
        description: 'ID of backup to verify',
        type: 'string',
        required: true,
        default: 'latest'
      }
    ]
  },
  {
    id: 'script20',
    name: 'Server Cleanup',
    path: '/maintenance/cleanup.sh',
    repository: 'main'
  }
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