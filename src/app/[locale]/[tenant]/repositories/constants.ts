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
  py: 'text-blue-500',
  sh: 'text-green-500',
  md: 'text-gray-500',
  txt: 'text-gray-400',
  default: ''
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