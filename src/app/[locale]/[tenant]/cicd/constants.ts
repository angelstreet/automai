// Debug settings
export const DEBUG = false;

// Local storage keys
export const STORAGE_KEYS = {
  CACHED_CICD: 'cached_cicd',
  CACHED_CICD_TIME: 'cached_cicd_time',
};

// Cache TTL settings (in milliseconds)
export const CACHE_TTL = {
  PROVIDERS: 5 * 60 * 1000, // 5 minutes
  JOBS: 2 * 60 * 1000, // 2 minutes
};

// Request cooldown period to prevent excessive API calls
export const REQUEST_COOLDOWN = 5000; // 5 seconds

// Initial state for the CICD context
export const INITIAL_STATE = {
  providers: [],
  jobs: [],
  builds: [],
  selectedProvider: null,
  selectedJob: null,
  loading: false,
  error: null,
  currentUser: null,
};

// Error messages
export const ERROR_MESSAGES = {
  FETCH_PROVIDERS: 'Failed to fetch CI/CD providers',
  CREATE_PROVIDER: 'Failed to create CI/CD provider',
  UPDATE_PROVIDER: 'Failed to update CI/CD provider',
  DELETE_PROVIDER: 'Failed to delete CI/CD provider',
  TEST_PROVIDER: 'Provider test failed',
  FETCH_JOBS: 'Failed to fetch CI/CD jobs',
  FETCH_JOB_DETAILS: 'Failed to fetch job details',
  TRIGGER_JOB: 'Failed to trigger job',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  CONTEXT_USAGE: 'useCICDContext must be used within a CICDProvider',
};

// CICD Module Constants
// These are temporary during migration and will be removed after React Query implementation

import {
  CICDProviderType,
  CICDProviderTypeConfig,
  CICDProviderPayload,
} from '@/types-new/cicd-types';

export const CICD_PROVIDER_CONFIGS: Record<CICDProviderType, CICDProviderTypeConfig> = {
  gitlab: {
    fields: {
      url: {
        show: false,
        disabled: true,
        value: 'https://gitlab.com',
      },
      port: {
        show: false,
        disabled: true,
        value: '443',
      },
      name: {
        show: true,
        required: true,
      },
      owner: {
        show: true,
        required: true,
        placeholder: 'Enter GitLab owner or group name',
      },
      repository: {
        show: true,
        required: true,
        placeholder: 'Enter repository name',
      },
      repository_url: {
        show: false,
      },
    },
    transformPayload: (data): CICDProviderPayload => ({
      name: data.name,
      type: 'gitlab',
      url: 'https://gitlab.com',
      auth_type: 'token',
      credentials: {
        owner: data.owner,
        repository: data.repository,
        token: data.token,
      },
    }),
  },
  github: {
    fields: {
      url: {
        show: false,
        disabled: true,
        value: 'https://api.github.com',
      },
      port: {
        show: false,
        disabled: true,
        value: '443',
      },
      name: {
        show: true,
        required: true,
      },
      owner: {
        show: false,
      },
      repository: {
        show: false,
      },
      repository_url: {
        show: true,
        required: true,
        placeholder: 'https://github.com/owner/repository',
      },
    },
    transformPayload: (data): CICDProviderPayload => {
      // Extract owner and repo from repository URL
      const repoUrl = new URL(data.repository_url);
      const [owner, repository] = repoUrl.pathname.split('/').filter(Boolean);

      return {
        name: data.name,
        type: 'github',
        url: 'https://api.github.com',
        auth_type: 'token',
        credentials: {
          owner,
          repository,
          token: data.token,
        },
      };
    },
  },
  jenkins: {
    fields: {
      url: {
        show: true,
        required: true,
        placeholder: 'https://jenkins.example.com',
      },
      port: {
        show: true,
        required: true,
        placeholder: '8080',
      },
      name: {
        show: true,
        required: true,
      },
      owner: {
        show: false,
      },
      repository: {
        show: false,
      },
      repository_url: {
        show: false,
      },
    },
    transformPayload: (data): CICDProviderPayload => ({
      name: data.name,
      type: 'jenkins',
      url: data.url,
      auth_type: 'token',
      credentials: {
        token: data.token,
      },
    }),
  },
};
