// Utility functions for deployments

/**
 * Format a date string for display
 */
export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  /**
   * Format relative time (e.g., "5 minutes ago")
   */
  export const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  };
  
  /**
   * Format future time (e.g., "in 5 minutes")
   */
  export const formatFutureTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    
    const now = new Date();
    const date = new Date(dateString);
    
    if (date <= now) return formatRelativeTime(dateString);
    
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `in a few seconds`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `in ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `in ${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `in ${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
  };
  
  /**
   * Calculate duration between two dates
   */
  export const calculateDuration = (startTime: string | null | undefined, endTime?: string | null): string => {
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    
    const seconds = Math.floor((durationMs / 1000) % 60);
    const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
  };
  
  /**
   * Get formatted time for display in the UI
   */
  export const getFormattedTime = (deployment: {
    startTime?: string | null;
    scheduledTime?: string | null;
  }): string => {
    if (deployment.startTime) {
      return `Started ${formatRelativeTime(deployment.startTime)}`;
    } else if (deployment.scheduledTime) {
      const now = new Date();
      const scheduledDate = new Date(deployment.scheduledTime);
      
      if (scheduledDate > now) {
        return formatFutureTime(deployment.scheduledTime);
      } else {
        return `Scheduled for ${formatRelativeTime(deployment.scheduledTime)}`;
      }
    }
    return 'Not scheduled';
  };
  
  /**
   * Group hosts by environment
   */
  export const groupHostsByEnvironment = (hosts: Array<{ environment: string; [key: string]: any }>) => {
    return hosts.reduce((acc, host) => {
      if (!acc[host.environment]) {
        acc[host.environment] = [];
      }
      acc[host.environment].push(host);
      return acc;
    }, {} as Record<string, Array<{ environment: string; [key: string]: any }>>);
  };