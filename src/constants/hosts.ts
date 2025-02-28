// Keep only real constants (remove mock data)
export const STATUS_VARIANTS = {
  running: 'bg-green-500/10 text-green-500 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
  offline: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export const CONNECTION_COLORS = {
  portainer: 'from-blue-500/10 to-blue-500/5',
  docker: 'from-green-500/10 to-green-500/5',
  ssh: 'from-gray-500/10 to-gray-500/5',
  unknown: 'from-gray-500/10 to-gray-500/5',
} as const;

export const CONNECTION_BADGE_COLORS = {
  portainer: 'bg-blue-500',
  docker: 'bg-green-500',
  ssh: 'bg-gray-500',
  unknown: 'bg-gray-500',
} as const;
