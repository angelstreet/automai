import { Device, Machine } from '@/types/virtualization';

export const MOCK_DEVICES: Device[] = [
  {
    id: '1',
    name: 'vm-tenant1-prod',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'portainer',
    alerts: [],
    containers: { total: 8, running: 8 }
  },
  {
    id: '2',
    name: 'vm-tenant2-dev',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'docker',
    alerts: [],
    containers: { total: 6, running: 6 }
  },
  {
    id: '3',
    name: 'vm-tenant3-staging',
    status: 'error',
    statusLabel: 'Error',
    connectionType: 'ssh',
    alerts: [
      { id: 'alert-1', type: 'memory', message: 'High memory usage' },
      { id: 'alert-2', type: 'cpu', message: 'High CPU usage' }
    ],
    containers: { total: 8, running: 4 }
  },
  {
    id: '4',
    name: 'vm-tenant4-test',
    status: 'warning',
    statusLabel: 'Warning',
    connectionType: 'portainer',
    alerts: [
      { id: 'alert-3', type: 'cpu', message: 'High CPU usage' }
    ],
    containers: { total: 10, running: 6 }
  },
  {
    id: '5',
    name: 'vm-tenant5-dev',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'docker',
    alerts: [],
    containers: { total: 4, running: 4 }
  }
];

// Mock data for machines
export const mockMachines: Machine[] = [
  {
    id: '1',
    name: 'Development Server',
    description: 'Main development server for testing',
    type: 'ssh',
    ip: '192.168.1.100',
    port: 22,
    status: 'connected',
    lastConnected: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Docker Host',
    description: 'Docker container host',
    type: 'docker',
    ip: '192.168.1.101',
    port: 2375,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Portainer Instance',
    description: 'Portainer container management',
    type: 'portainer',
    ip: '192.168.1.102',
    port: 9000,
    status: 'failed',
    errorMessage: 'Connection refused',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const CONNECTION_COLORS = {
  portainer: 'from-blue-500/10 to-blue-500/5',
  docker: 'from-green-500/10 to-green-500/5',
  ssh: 'from-gray-500/10 to-gray-500/5',
  unknown: 'from-gray-500/10 to-gray-500/5'
} as const;

export const CONNECTION_BADGE_COLORS = {
  portainer: 'bg-blue-500',
  docker: 'bg-green-500',
  ssh: 'bg-gray-500',
  unknown: 'bg-gray-500'
} as const;

export const STATUS_VARIANTS = {
  running: 'bg-green-500/10 text-green-500 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
  offline: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export const generateTestDevices = (count: number = 25) => Array.from({ length: count }, (_, i) => {
  const status = ['running', 'warning', 'error'][Math.floor(Math.random() * 3)] as 'running' | 'warning' | 'error';
  const statusLabel = {
    running: 'Running',
    warning: 'Warning',
    error: 'Error'
  }[status];
  
  return {
    id: `device-${i + 1}`,
    name: `Test Device ${i + 1}`,
    status,
    statusLabel,
    connectionType: ['portainer', 'docker', 'ssh'][Math.floor(Math.random() * 3)] as 'portainer' | 'docker' | 'ssh',
    containers: {
      running: Math.floor(Math.random() * 5),
      total: Math.floor(Math.random() * 10) + 5,
    },
    alerts: Array.from({ length: Math.floor(Math.random() * 3) }, (_, j) => ({
      id: `alert-${i}-${j}`,
      type: ['memory', 'cpu', 'error'][Math.floor(Math.random() * 3)] as 'memory' | 'cpu' | 'error',
      message: `Test alert message ${j + 1}`,
    })),
  };
}); 