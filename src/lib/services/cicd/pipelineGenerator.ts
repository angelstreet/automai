import { CICDPipelineConfig } from '@/types/service/cicdServiceTypes';

/**
 * CI/CD Pipeline Generator
 * Generates CI/CD pipeline configurations for different providers
 */
export interface PipelineGeneratorOptions {
  // Repository information
  repositoryUrl: string;
  branch: string;

  // Deployment information
  deploymentName: string;
  deploymentId: string;

  // Script information
  scripts: Array<{
    id: string;
    path: string;
    type: string;
    parameters?: string;
  }>;

  // Host information
  hosts: Array<{
    id: string;
    name: string;
    ip: string;
    environment?: string;
    username?: string; // SSH username
    password?: string; // SSH password or token
    key?: string; // SSH private key
    token?: string; // Authentication token if applicable
    is_windows?: boolean; // Whether host is a Windows machine
  }>;

  // Schedule information
  schedule?: 'now' | 'later';
  scheduledTime?: string;

  // Additional options
  additionalParams?: Record<string, any>;
}

export class PipelineGenerator {
  /**
   * Generates a predictable trigger token from a deployment name
   * This token can be used for remote triggering of CI/CD jobs
   *
   * @param deploymentName The name of the deployment to generate token for
   * @returns A cleaned trigger token string
   */
  static generateTriggerToken(deploymentName: string): string {
    // Clean the deployment name: lowercase, replace spaces/special chars with underscores
    const baseTokenName = deploymentName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with a single one
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

    // Return token with standard suffix
    return `${baseTokenName}_trigger`;
  }
  /**
   * Generates a pipeline configuration object that matches CICDPipelineConfig interface
   */
  static generatePipelineConfig(
    jobName: string,
    repositoryId: string,
    description: string = '',
  ): CICDPipelineConfig {
    return {
      name: jobName,
      description: description,
      repository: {
        id: repositoryId,
      },
      stages: [
        {
          name: 'Checkout',
          steps: [
            {
              type: 'shell',
              command: 'echo "Checking out repository"',
              script: 'checkout.sh',
            },
          ],
        },
        {
          name: 'Deploy',
          steps: [
            {
              type: 'shell',
              command: 'echo "Deploying to hosts"',
              script: 'deploy.sh',
            },
          ],
        },
      ],
      parameters: [
        {
          name: 'DEPLOYMENT_NAME',
          type: 'text' as const,
          description: 'Deployment name',
          defaultValue: jobName,
        },
      ],
    };
  }

  /**
   * Generate a pipeline configuration for a specific CI/CD provider
   * @param provider The CI/CD provider type
   * @param options Pipeline generation options
   * @returns The pipeline configuration as a string
   */
  static generate(
    provider: 'jenkins' | 'github' | 'gitlab' | 'circleci',
    options: PipelineGeneratorOptions,
  ): { pipeline: string; jobConfigXml?: string } {
    switch (provider.toLowerCase()) {
      case 'jenkins':
        return this.generateJenkinsPipeline(options);
      case 'github':
        return { pipeline: this.generateGitHubWorkflow(options) };
      case 'gitlab':
        return { pipeline: this.generateGitLabCI(options) };
      case 'circleci':
        return { pipeline: this.generateCircleCI(options) };
      default:
        throw new Error(`Unsupported CI/CD provider type: ${provider}`);
    }
  }

  /**
   * Generate a Jenkins pipeline
   * @param options Pipeline generation options
   * @returns Jenkins pipeline as a string
   */
  private static generateJenkinsPipeline(options: PipelineGeneratorOptions): {
    pipeline: string;
    jobConfigXml: string;
  } {
    const { repositoryUrl, branch, deploymentName, scripts, hosts, additionalParams } = options;

    // Get description from additionalParams if available
    const description = additionalParams?.DEPLOYMENT_DESCRIPTION || '';

    // Generate a trigger token based on deployment name
    const triggerToken =
      additionalParams?.TRIGGER_TOKEN || this.generateTriggerToken(deploymentName);

    // Format hosts as JSON array for the pipeline
    const hostsJson = JSON.stringify(
      hosts.map(
        (host) =>
          `${host.name} (${host.ip})${host.environment ? ' #' + host.environment.toLowerCase() : ''}`,
      ),
    );

    // Generate host connection configurations using credentials from database
    const hostConnectionConfigs = hosts
      .map((host) => {
        const isWindows = host.is_windows || host.environment?.toLowerCase() === 'windows';
        const username = host.username || 'ubuntu'; // Default username

        const connectionConfig = `          // Connect to ${host.name} (${host.ip})
          withCredentials([usernamePassword(credentialsId: 'host-credentials-${host.id}', usernameVariable: 'USER', passwordVariable: 'PASSWORD')]) {
            def hostIP = "${host.ip}"
            def hostUser = "$USER"
            
            echo "Connecting to ${host.name} (${host.ip})"
            
            def sshOptions = "-o StrictHostKeyChecking=no"
            def sshPass = "sshpass -p '$PASSWORD'"
            
            try {
              // Copy scripts to remote host
              ${scripts
                .map((script) => {
                  const scriptPath = script.path || script.id;
                  return `sh "$sshPass scp $sshOptions ${scriptPath} $hostUser@$hostIP:/tmp/"`;
                })
                .join('\n              ')}
              
              // Execute scripts on remote host
              ${scripts
                .map((script) => {
                  const scriptPath = script.path || script.id;
                  const params = script.parameters ? ` ${script.parameters}` : '';
                  const executor = script.type === 'python' ? 'python' : 'sh';
                  const remotePath = `/tmp/${scriptPath.split('/').pop()}`;

                  if (isWindows) {
                    return `sh "$sshPass ssh $sshOptions $hostUser@$hostIP powershell -Command \\"${
                      executor === 'python' ? 'python' : '.'
                    } ${remotePath}${params}\\""`;
                  } else {
                    return `sh "$sshPass ssh $sshOptions $hostUser@$hostIP '${
                      executor === 'python' ? 'python' : 'bash'
                    } ${remotePath}${params}'"`;
                  }
                })
                .join('\n              ')}
            } finally {
              // No key file to clean up
            }
          }`;

        return connectionConfig;
      })
      .join('\n\n');

    // Return both pipeline script and job config XML
    const result = {
      pipeline: `pipeline {
    agent any
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    
    parameters {
        string(name: 'REPOSITORY_URL', defaultValue: '${repositoryUrl}', description: 'Repository URL')
        string(name: 'BRANCH', defaultValue: '${branch}', description: 'Repository branch')
        string(name: 'DEPLOYMENT_NAME', defaultValue: '${deploymentName}', description: 'Deployment name')
        string(name: 'DEPLOYMENT_DESCRIPTION', defaultValue: '${description}', description: 'Deployment description')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "\${params.BRANCH}"]],
                    userRemoteConfigs: [[url: "\${params.REPOSITORY_URL}"]]
                ])
            }
        }
        
        stage('Install dependencies') {
            steps {
                sh 'apt-get update && apt-get install -y sshpass'
            }
        }
        
        stage('Deploy to Hosts') {
            steps {
                script {
                    def hosts = ${hostsJson}
                    echo "Deploying to hosts: \${hosts}"
                    
${hostConnectionConfigs}
                }
            }
        }
        
        stage('Verification') {
            steps {
                echo "Verifying deployment of \${params.DEPLOYMENT_NAME}"
                echo "Deployment completed"
            }
        }
    }
    
    post {
        success {
            echo "Deployment successful"
        }
        failure {
            echo "Deployment failed"
        }
    }
}`,
      jobConfigXml: `<triggers>
    <hudson.triggers.RemoteTrigger>
      <token>${triggerToken}</token>
    </hudson.triggers.RemoteTrigger>
  </triggers>`,
    };

    // Log the full configuration for debugging
    console.log(`[@service:jenkins:generateJenkinsPipeline] Full pipeline configuration:`, {
      pipeline: result.pipeline,
      jobConfigXml: result.jobConfigXml,
    });

    return result;
  }

  /**
   * Generate a GitHub Actions workflow
   * @param options Pipeline generation options
   * @returns GitHub Actions workflow as a string
   */
  private static generateGitHubWorkflow(_options: PipelineGeneratorOptions): string {
    // Basic GitHub workflow implementation
    return `# GitHub Actions workflow
name: Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'production'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup environment
        run: echo "Setting up environment \${{ github.event.inputs.environment }}"
      
      - name: Deploy
        run: echo "Deployment started"
        
      - name: Verify
        run: echo "Verifying deployment"`;
  }

  /**
   * Generate a GitLab CI pipeline
   * @param options Pipeline generation options
   * @returns GitLab CI pipeline as a string
   */
  private static generateGitLabCI(_options: PipelineGeneratorOptions): string {
    // Basic GitLab CI implementation
    return `# GitLab CI pipeline
stages:
  - prepare
  - deploy
  - verify

variables:
  DEPLOYMENT_NAME: "Deployment"

prepare:
  stage: prepare
  script:
    - echo "Preparing deployment"
  
deploy:
  stage: deploy
  script:
    - echo "Deploying to hosts"
  
verify:
  stage: verify
  script:
    - echo "Verifying deployment"
  when: on_success`;
  }

  /**
   * Generate a CircleCI config
   * @param options Pipeline generation options
   * @returns CircleCI config as a string
   */
  private static generateCircleCI(options: PipelineGeneratorOptions): string {
    const { repositoryUrl, branch, deploymentName, scripts, hosts, schedule, scheduledTime } =
      options;

    // Format host information for the pipeline
    const hostsJson = JSON.stringify(
      hosts.map(
        (host) =>
          `${host.name} (${host.ip})${host.environment ? ' #' + host.environment.toLowerCase() : ''}`,
      ),
    );

    // Format script execution commands
    const scriptCommands = scripts
      .map((script) => {
        const scriptPath = script.path || script.id;
        const params = script.parameters ? ` ${script.parameters}` : '';
        const executor = script.type === 'python' ? 'python' : 'sh';

        if (executor === 'python') {
          return `      - run:
          name: "Execute ${scriptPath}"
          command: python ${scriptPath}${params}`;
        } else {
          return `      - run:
          name: "Execute ${scriptPath}"
          command: sh ${scriptPath}${params}`;
        }
      })
      .join('\n');

    // Generate deployment commands for each host
    const hostCommands =
      hosts.length > 0
        ? `      - run:
          name: "Define Hosts"
          command: |
            HOSTS=(${hostsJson.replace(/"/g, '\\"')})
            echo "Available deployment targets: \${HOSTS[@]}"
            
      - run:
          name: "Deploy to Hosts"
          command: |
            for host in ${hosts.map((h) => `"${h.name} (${h.ip})"`).join(' ')}; do
              echo "Deploying to $host"
            done`
        : '';

    // Build the CircleCI config
    return `# CircleCI configuration for ${deploymentName}
version: 2.1

parameters:
  deployment-name:
    type: string
    default: "${deploymentName}"
  repository-url:
    type: string
    default: "${repositoryUrl}"
  branch:
    type: string
    default: "${branch}"
${
  schedule === 'later' && scheduledTime
    ? `  scheduled-time:
    type: string
    default: "${scheduledTime}"`
    : ''
}

jobs:
  deploy:
    docker:
      - image: cimg/base:2023.03
    steps:
      - checkout
      
      - run:
          name: "Setup Deployment"
          command: |
            echo "Setting up deployment << pipeline.parameters.deployment-name >>"
            echo "Repository: << pipeline.parameters.repository-url >>"
            echo "Branch: << pipeline.parameters.branch >>"
${
  schedule === 'later' && scheduledTime
    ? `            echo "Scheduled time: << pipeline.parameters.scheduled-time >>"`
    : ''
}

${hostCommands}

${scriptCommands}
      
      - run:
          name: "Verify Deployment"
          command: |
            echo "Verifying deployment"
            echo "Deployment completed successfully"

workflows:
  version: 2
  deployment:
    jobs:
      - deploy${
        schedule === 'later'
          ? `
    # Scheduled execution can be configured here
    triggers:
      - schedule:
          cron: "${scheduledTime ? '0 0 * * *' : '0 0 * * *'}" # Default daily at midnight
          filters:
            branches:
              only:
                - ${branch}`
          : ''
      }`;
  }

  /**
   * Generate provider-specific pipeline configuration
   * @param provider The CI/CD provider type
   * @param options Pipeline generation options
   * @returns The provider-specific pipeline configuration
   */
  static generateProviderConfig(
    provider: 'jenkins' | 'github' | 'gitlab' | 'circleci',
    options: PipelineGeneratorOptions,
  ): { pipeline: string; jobConfigXml?: string } {
    switch (provider.toLowerCase()) {
      case 'jenkins':
        return this.generateJenkinsPipeline(options);
      case 'github':
        return { pipeline: this.generateGitHubWorkflow(options) };
      case 'gitlab':
        return { pipeline: this.generateGitLabCI(options) };
      case 'circleci':
        return { pipeline: this.generateCircleCI(options) };
      default:
        throw new Error(`Unsupported CI/CD provider type: ${provider}`);
    }
  }
}
