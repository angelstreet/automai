'use client';

import { CheckCircle, XCircle, Play, Clock, AlertTriangle, Calendar } from 'lucide-react';
import React from 'react';

import { STATUS_CONFIG } from '../../constants';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// Define the type for STATUS_CONFIG keys
type StatusType = 
  | 'success' | 'failed' | 'in_progress' | 'pending' | 'scheduled' | 'warning' 
  | 'running' | 'completed' | 'cancelled';

/**
 * StatusBadge component for displaying deployment and script statuses
 */
const DeploymentStatusBadgeClient: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  // Get the appropriate icon component based on status
  const getStatusIcon = (iconName: string) => {
    switch (iconName) {
      case 'CheckCircle':
        return <CheckCircle className="w-3.5 h-3.5 mr-1" />;
      case 'XCircle':
        return <XCircle className="w-3.5 h-3.5 mr-1" />;
      case 'Play':
        return <Play className="w-3.5 h-3.5 mr-1" />;
      case 'Clock':
        return <Clock className="w-3.5 h-3.5 mr-1" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
      case 'Calendar':
        return <Calendar className="w-3.5 h-3.5 mr-1" />;
      default:
        return <Clock className="w-3.5 h-3.5 mr-1" />;
    }
  };

  // Get config for this status, or use default
  const config = STATUS_CONFIG[status as StatusType] || {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    icon: 'Clock',
  };

  // Format the status text safely, handling null or undefined
  const formatStatus = () => {
    if (!status) return 'Unknown';
    
    // Replace underscores with spaces and capitalize first letter
    const formattedStatus = String(status).replace(/_/g, ' ');
    return formattedStatus.charAt(0).toUpperCase() + formattedStatus.slice(1);
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.color} ${className}`}
    >
      {getStatusIcon(config.icon)}
      <span className="truncate">
        {formatStatus()}
      </span>
    </span>
  );
};

export default DeploymentStatusBadgeClient;
export { DeploymentStatusBadgeClient };
