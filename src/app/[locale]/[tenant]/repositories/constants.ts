/**
 * Constants related to repositories
 */

// Import types
import { Repository, GitProvider, GitProviderType } from './types';

// Language color mapping for repository cards
export const LANGUAGE_COLORS: Record<string, string> = {
  python: 'bg-blue-100 text-blue-800 border-blue-200',
  javascript: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  typescript: 'bg-blue-100 text-blue-800 border-blue-200',
  bash: 'bg-green-100 text-green-800 border-green-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200'
};

// File extension color mapping for file explorer
export const FILE_EXTENSION_COLORS: Record<string, string> = {
  // Programming languages
  py: 'text-blue-500',
  js: 'text-yellow-500',
  ts: 'text-blue-500',
  jsx: 'text-blue-400',
  tsx: 'text-blue-600',
  go: 'text-teal-500',
  rb: 'text-red-500',
  php: 'text-purple-500',
  java: 'text-orange-500',
  scala: 'text-red-400',
  c: 'text-blue-300',
  cpp: 'text-blue-500',
  cs: 'text-green-500',
  rs: 'text-orange-500',
  swift: 'text-orange-500',
  kt: 'text-purple-400',
  
  // Shell scripts
  sh: 'text-green-500',
  bash: 'text-green-500',
  zsh: 'text-green-500',
  fish: 'text-green-400',
  
  // Web
  html: 'text-orange-500',
  css: 'text-blue-400',
  scss: 'text-pink-500',
  sass: 'text-pink-500',
  less: 'text-blue-400',
  svg: 'text-orange-400',
  
  // Data formats
  json: 'text-yellow-500',
  yaml: 'text-red-400',
  yml: 'text-red-400',
  xml: 'text-orange-400',
  csv: 'text-green-500',
  
  // Documentation
  md: 'text-gray-500',
  txt: 'text-gray-400',
  pdf: 'text-red-500',
  doc: 'text-blue-500',
  docx: 'text-blue-500',
  
  // Config files
  toml: 'text-gray-500',
  ini: 'text-gray-500',
  cfg: 'text-gray-500',
  conf: 'text-gray-500',
  
  // Docker
  dockerfile: 'text-blue-500',
  
  // Default
  default: 'text-gray-400'
};

// Explorer tabs
export const EXPLORER_TABS = {
  CODE: 'code',
  ISSUES: 'issues',
  PULL_REQUESTS: 'prs',
  ACTIONS: 'actions',
  SETTINGS: 'settings'
};

// Repository categories for filtering
export const REPOSITORY_CATEGORIES = [
  'All',
  'Deployment',
  'Data Processing',
  'Testing',
  'Documentation',
  'APIs'
];

// Popular repositories by category for quick import
export const POPULAR_REPOSITORIES: Record<string, Array<{
  id: string;
  name: string;
  description: string;
  url: string;
  stars: string;
  category: string;
}>> = {
  'CI/CD': [
    { 
      id: '1', 
      name: 'actions/runner-images', 
      description: 'GitHub Actions runner images',
      url: 'https://github.com/actions/runner-images.git',
      stars: '4.2k',
      category: 'CI/CD'
    },
    { 
      id: '2', 
      name: 'jenkins-x/jx', 
      description: 'Jenkins X provides automated CI/CD for Kubernetes',
      url: 'https://github.com/jenkins-x/jx.git',
      stars: '3.8k',
      category: 'CI/CD'
    }
  ],
  'Data Processing': [
    { 
      id: '3', 
      name: 'apache/spark', 
      description: 'Apache Spark - A unified analytics engine',
      url: 'https://github.com/apache/spark.git',
      stars: '32.5k',
      category: 'Data Processing'
    },
    { 
      id: '4', 
      name: 'pandas-dev/pandas', 
      description: 'Flexible and powerful data analysis toolkit',
      url: 'https://github.com/pandas-dev/pandas.git',
      stars: '34.6k',
      category: 'Data Processing'
    }
  ],
  'Testing': [
    { 
      id: '5', 
      name: 'pytest-dev/pytest', 
      description: 'The pytest framework makes it easy to write tests',
      url: 'https://github.com/pytest-dev/pytest.git',
      stars: '9.1k',
      category: 'Testing'
    },
    { 
      id: '6', 
      name: 'facebook/jest', 
      description: 'Delightful JavaScript Testing',
      url: 'https://github.com/facebook/jest.git',
      stars: '40.2k',
      category: 'Testing'
    }
  ]
};

// Provider display information
export const PROVIDER_DISPLAY_INFO: Record<GitProviderType, { name: string, color: string, icon: string }> = {
  'github': {
    name: 'GitHub',
    color: 'bg-black text-white',
    icon: 'github'
  },
  'gitlab': {
    name: 'GitLab',
    color: 'bg-orange-500 text-white',
    icon: 'gitlab'
  },
  'gitea': {
    name: 'Gitea',
    color: 'bg-teal-500 text-white',
    icon: 'gitea'
  },
  'self-hosted': {
    name: 'Self-Hosted',
    color: 'bg-gray-500 text-white',
    icon: 'git'
  }
};

// Cache TTL values in milliseconds
export const CACHE_TTL = {
  REPOSITORIES: 5 * 60 * 1000, // 5 minutes
  REPOSITORY: 2 * 60 * 1000,   // 2 minutes
  USER: 15 * 60 * 1000,        // 15 minutes
};

// Repository connection tabs
export const CONNECT_REPOSITORY_TABS = {
  OAUTH: 'oauth',
  QUICK_CLONE: 'quick-clone',
  TOKEN: 'token'
};

// Repository authentication methods
export const AUTH_METHODS = {
  OAUTH: 'oauth',
  TOKEN: 'token',
  URL: 'url'
};

// Repository sync status styling
export const SYNC_STATUS_STYLES: Record<string, string> = {
  SYNCED: 'bg-green-100 text-green-800 border-green-200',
  SYNCING: 'bg-blue-100 text-blue-800 border-blue-200',
  ERROR: 'bg-red-100 text-red-800 border-red-200',
  IDLE: 'bg-gray-100 text-gray-800 border-gray-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};