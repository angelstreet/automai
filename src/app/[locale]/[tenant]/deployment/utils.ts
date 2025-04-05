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
export const calculateDuration = (
  startTime: string | null | undefined,
  endTime?: string | null,
): string => {
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
 * Overloaded to handle both a single date string or start/end time for duration
 */
export function getFormattedTime(dateString: string): string;
export function getFormattedTime(startTime: string, endTime: string): string;
export function getFormattedTime(timeA: string, timeB?: string): string {
  if (timeB) {
    // If two parameters, calculate duration
    return calculateDuration(timeA, timeB);
  }

  // If one parameter, format as relative time
  return formatRelativeTime(timeA);
}

/**
 * Group hosts by environment
 */
export const groupHostsByEnvironment = (
  hosts: Array<{ environment: string; [key: string]: any }>,
) => {
  return hosts.reduce(
    (acc, host) => {
      if (!acc[host.environment]) {
        acc[host.environment] = [];
      }
      acc[host.environment].push(host);
      return acc;
    },
    {} as Record<string, Array<{ environment: string; [key: string]: any }>>,
  );
};

/**
 * Maps deployment data to CI/CD job parameters
 * @param deployment The deployment data
 * @returns A record of parameter name to parameter value
 */
export function mapDeploymentToParameters(deployment: any): Record<string, any> {
  // Basic deployment info
  const parameters: Record<string, any> = {
    DEPLOYMENT_NAME: deployment.name || '',
    DEPLOYMENT_DESCRIPTION: deployment.description || '',
    REPOSITORY_ID: deployment.repositoryId || deployment.repository_id || '',
  };

  // Add scripts information
  if (deployment.scriptIds && deployment.scriptIds.length > 0) {
    parameters.SCRIPT_IDS = deployment.scriptIds.join(',');
  } else if (deployment.scripts_path && deployment.scripts_path.length > 0) {
    parameters.SCRIPT_PATHS = deployment.scripts_path.join(',');
  }

  // Add host information
  if (deployment.hostIds && deployment.hostIds.length > 0) {
    parameters.HOST_IDS = deployment.hostIds.join(',');
  } else if (deployment.host_ids && deployment.host_ids.length > 0) {
    parameters.HOST_IDS = deployment.host_ids.join(',');
  }

  // Add schedule information
  parameters.SCHEDULE_TYPE = deployment.schedule || deployment.schedule_type || 'now';
  if (deployment.scheduledTime || deployment.scheduled_time) {
    parameters.SCHEDULED_TIME = deployment.scheduledTime || deployment.scheduled_time;
  }

  // Add script parameters if available
  if (deployment.scriptParameters && Object.keys(deployment.scriptParameters).length > 0) {
    Object.entries(deployment.scriptParameters).forEach(([scriptId, params]) => {
      if (params && params.raw) {
        parameters[`SCRIPT_PARAMS_${scriptId}`] = params.raw;
      }
    });
  }

  // Add environment variables
  if (deployment.environmentVars && deployment.environmentVars.length > 0) {
    deployment.environmentVars.forEach((env: any, index: number) => {
      if (env.key) {
        parameters[`ENV_${env.key}`] = env.value || '';
      }
    });
  }

  return parameters;
}
