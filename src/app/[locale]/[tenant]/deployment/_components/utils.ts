// Helper functions for deployment components

/**
 * Format a date string for display
 */
export const formatDate = (dateString: string | null) => {
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

/**
 * Format a date string with seconds for detailed display
 */
export const formatDetailedDate = (dateString: string | null) => {
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

/**
 * Calculate duration between two dates
 */
export const calculateDuration = (startTime: string | null, endTime: string | null) => {
  if (!startTime || !endTime) return 'N/A';
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  
  const seconds = Math.floor(durationMs / 1000) % 60;
  const minutes = Math.floor(durationMs / 1000 / 60) % 60;
  const hours = Math.floor(durationMs / 1000 / 60 / 60);
  
  return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
}; 