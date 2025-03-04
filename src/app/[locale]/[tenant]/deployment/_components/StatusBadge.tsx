'use client';

import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Loader2
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  let bgColor = 'bg-gray-100 dark:bg-gray-700';
  let textColor = 'text-gray-700 dark:text-gray-300';
  let Icon = Clock;

  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case 'success':
      bgColor = 'bg-green-100 dark:bg-green-900/30';
      textColor = 'text-green-700 dark:text-green-400';
      Icon = CheckCircle;
      break;
    case 'failed':
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      textColor = 'text-red-700 dark:text-red-400';
      Icon = XCircle;
      break;
    case 'in_progress':
    case 'running':
      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
      textColor = 'text-blue-700 dark:text-blue-400';
      Icon = Loader2;
      break;
    case 'pending':
    case 'scheduled':
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
      textColor = 'text-yellow-700 dark:text-yellow-400';
      Icon = Clock;
      break;
    case 'cancelled':
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-700 dark:text-gray-400';
      Icon = XCircle;
      break;
    case 'partial':
      bgColor = 'bg-orange-100 dark:bg-orange-900/30';
      textColor = 'text-orange-700 dark:text-orange-400';
      Icon = AlertTriangle;
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm ${bgColor} ${textColor}`}>
      <Icon className="w-3.5 h-3.5 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
};

export default StatusBadge; 