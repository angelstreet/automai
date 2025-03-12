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
  
  // Mock runners for execution environment selection
  export const SAMPLE_RUNNERS = [
    { id: '1', name: 'Python Runner', type: 'docker', status: 'available' },
    { id: '2', name: 'Ubuntu Server', type: 'ssh', status: 'available' },
    { id: '3', name: 'Data Node', type: 'ssh', status: 'busy' }
  ];
  
  // Sample file structure for a repository explorer
  export const SAMPLE_FILES: Record<string, any> = {
    'src': {
      type: 'folder',
      children: {
        'main.py': { type: 'file', size: '4.2 KB', lastModified: '2025-02-28' },
        'utils': {
          type: 'folder',
          children: {
            'helpers.py': { type: 'file', size: '2.8 KB', lastModified: '2025-02-15' },
            'config.py': { type: 'file', size: '1.5 KB', lastModified: '2025-02-20' }
          }
        }
      }
    },
    'tests': {
      type: 'folder',
      children: {
        'test_main.py': { type: 'file', size: '3.1 KB', lastModified: '2025-02-25' }
      }
    },
    'README.md': { type: 'file', size: '8.5 KB', lastModified: '2025-03-01' },
    'requirements.txt': { type: 'file', size: '0.5 KB', lastModified: '2025-02-10' }
  };
  
  // Sample Python code for file content preview
  export const SAMPLE_FILE_CONTENT = `#!/usr/bin/env python3
  import argparse
  import logging
  import sys
  from pathlib import Path
  
  logging.basicConfig(
      level=logging.INFO,
      format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
  )
  logger = logging.getLogger(__name__)
  
  def parse_arguments():
      """Parse command line arguments."""
      parser = argparse.ArgumentParser(description='Process some data.')
      parser.add_argument('--input', type=str, required=True, help='Input file path')
      parser.add_argument('--output', type=str, required=True, help='Output file path')
      parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
      
      return parser.parse_args()
  
  def main():
      """Main entry point of the script."""
      args = parse_arguments()
      
      if args.verbose:
          logger.setLevel(logging.DEBUG)
      
      logger.info(f"Processing input file: {args.input}")
      input_path = Path(args.input)
      output_path = Path(args.output)
      
      if not input_path.exists():
          logger.error(f"Input file does not exist: {args.input}")
          return 1
      
      # Process the file
      try:
          with open(input_path, 'r') as f_in, open(output_path, 'w') as f_out:
              for line in f_in:
                  # Example processing: convert to uppercase
                  processed_line = line.upper()
                  f_out.write(processed_line)
          
          logger.info(f"Successfully processed file and saved to: {args.output}")
          return 0
      except Exception as e:
          logger.error(f"Error processing file: {e}")
          return 1
  
  if __name__ == "__main__":
      sys.exit(main())
  `;
  
  // Mock repositories data for the UI demo
  export const MOCK_REPOSITORIES: Repository[] = [
    {
      id: '1',
      name: 'deployment-scripts',
      description: 'CI/CD and deployment automation scripts',
      providerType: 'github',
      providerId: 'github-1',
      isPrivate: false,
      language: 'Python',
      lastSyncedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      defaultBranch: 'main',
      syncStatus: 'SYNCED',
      owner: 'company',
      url: 'https://github.com/company/deployment-scripts',
      createdAt: new Date(Date.now() - 3000000000).toISOString(),
      updated_at: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: '2',
      name: 'system-utils',
      description: 'System monitoring and maintenance utilities',
      providerType: 'github',
      providerId: 'github-1',
      isPrivate: true,
      language: 'Bash',
      lastSyncedAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
      defaultBranch: 'main',
      syncStatus: 'SYNCED',
      owner: 'username',
      url: 'https://github.com/username/system-utils',
      createdAt: new Date(Date.now() - 5000000000).toISOString(),
      updated_at: new Date(Date.now() - 432000000).toISOString()
    },
    {
      id: '3',
      name: 'data-pipelines',
      description: 'ETL and data processing pipelines',
      providerType: 'gitlab',
      providerId: 'gitlab-1',
      isPrivate: false,
      language: 'Python',
      lastSyncedAt: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
      defaultBranch: 'master',
      syncStatus: 'IDLE',
      owner: 'department',
      url: 'https://gitlab.com/department/data-pipelines',
      createdAt: new Date(Date.now() - 4000000000).toISOString(),
      updated_at: new Date(Date.now() - 604800000).toISOString()
    }
  ];