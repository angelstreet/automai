/**
 * Constants related to repositories
 */

// Import types
import { Repository, GitProvider } from '../types';

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
        name: 'jenkins-x/jx3-pipeline-catalog', 
        description: 'Jenkins X Pipeline Catalog',
        url: 'https://github.com/jenkins-x/jx3-pipeline-catalog.git',
        stars: '1.7k',
        category: 'CI/CD'
      }
    ],
    'Automation': [
      { 
        id: '3', 
        name: 'ansible/ansible', 
        description: 'Ansible automation platform',
        url: 'https://github.com/ansible/ansible.git',
        stars: '58.1k',
        category: 'Automation'
      },
      { 
        id: '4', 
        name: 'puppetlabs/puppet', 
        description: 'Puppet infrastructure automation',
        url: 'https://github.com/puppetlabs/puppet.git',
        stars: '7.3k',
        category: 'Automation'
      }
    ],
    'Monitoring': [
      { 
        id: '5', 
        name: 'grafana/grafana', 
        description: 'Grafana observability platform',
        url: 'https://github.com/grafana/grafana.git',
        stars: '57.2k',
        category: 'Monitoring'
      },
      { 
        id: '6', 
        name: 'prometheus/prometheus', 
        description: 'Prometheus monitoring system',
        url: 'https://github.com/prometheus/prometheus.git',
        stars: '48.9k',
        category: 'Monitoring'
      }
    ]
  };
  
  // TODO: Replace with actual runners from the API
  export const SAMPLE_RUNNERS = [
    { id: '1', name: 'Default Runner', type: 'default', status: 'available' }
  ];
  
  // Mock sample file structure and content for repository explorer 
  // TODO: Replace with real data from API
  export const SAMPLE_FILES: Record<string, any> = {
    'README.md': { 
      type: 'file', 
      size: '1.2 KB', 
      lastModified: '2023-01-01' 
    }
  };
  
  export const SAMPLE_FILE_CONTENT = `# Repository

This is a placeholder README for the repository.
  `;