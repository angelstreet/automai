// Sample data for development and testing

import { Project, Host, Deployment } from './types';

// Sample projects data
export const sampleProjects: Project[] = [
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

// Sample hosts data
export const sampleHosts: Host[] = [
  { id: 1, name: 'Production Web Server', ip: '192.168.1.10', environment: 'Production' },
  { id: 2, name: 'Production DB Server', ip: '192.168.1.11', environment: 'Production' },
  { id: 3, name: 'Staging Server', ip: '192.168.2.10', environment: 'Staging' },
  { id: 4, name: 'Dev Environment', ip: '192.168.3.10', environment: 'Development' },
  { id: 5, name: 'Test Server', ip: '192.168.3.11', environment: 'Testing' }
];

// Sample deployments data
export const sampleDeployments: Deployment[] = [
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