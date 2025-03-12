// features/deployments/constants.ts

export const STATUS_CONFIG = {
    pending: { 
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', 
      icon: 'Clock'
    },
    in_progress: { 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', 
      icon: 'Play'
    },
    success: { 
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', 
      icon: 'CheckCircle' 
    },
    failed: { 
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', 
      icon: 'XCircle'
    },
    // And other statuses...
  };
  
  export const ENVIRONMENT_TYPES = [
    'Production',
    'Staging',
    'Development',
    'Testing'
  ];
  
  // Sample data for testing/development
  export const SAMPLE_DEPLOYMENTS = [
    // ...array of sample deployments
  ];