import { CICDJobConfig, CreateCICDJobParams } from '@/types-new';

/**
 * Generate a consistent trigger token for a deployment
 */
export function generateTriggerToken(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_trigger`;
}

/**
 * Generate Jenkins pipeline configuration
 */
export function generateJenkinsPipeline(params: CreateCICDJobParams): CICDJobConfig {
  console.log(`[@service:cicd:jenkins] Generating pipeline config for ${params.name}`);

  // Format hosts as JSON array for the pipeline
  const hostsJson = JSON.stringify(
    params.hosts.map(
      (host) =>
        `${host.name} (${host.ip})${host.environment ? ' #' + host.environment.toLowerCase() : ''}`,
    ),
  );

  // Generate pipeline script
  const pipeline = `pipeline {
    agent any
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    
    parameters {
        string(name: 'REPOSITORY_URL', defaultValue: '${params.repository.url}', description: 'Repository URL')
        string(name: 'BRANCH', defaultValue: '${params.repository.branch}', description: 'Repository branch')
        string(name: 'DEPLOYMENT_NAME', defaultValue: '${params.name}', description: 'Deployment name')
        string(name: 'DEPLOYMENT_DESCRIPTION', defaultValue: '${params.description || ''}', description: 'Deployment description')
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
                    
                    ${generateHostDeploymentSteps(params)}
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
}`;

  return {
    name: params.name,
    description: params.description,
    pipeline,
    parameters: [
      {
        name: 'REPOSITORY_URL',
        type: 'string',
        description: 'Repository URL',
        defaultValue: params.repository.url,
      },
      {
        name: 'BRANCH',
        type: 'string',
        description: 'Repository branch',
        defaultValue: params.repository.branch,
      },
    ],
    triggers: {
      type: 'webhook',
      token: generateTriggerToken(params.name),
    },
  };
}

/**
 * Generate host deployment steps
 */
function generateHostDeploymentSteps(params: CreateCICDJobParams): string {
  return params.hosts
    .map((host) => {
      const isWindows = host.environment?.toLowerCase() === 'windows';

      return `          // Connect to ${host.name} (${host.ip})
          withCredentials([usernamePassword(credentialsId: 'host-credentials-${host.name}', usernameVariable: 'USER', passwordVariable: 'PASSWORD')]) {
            def hostIP = "${host.ip}"
            def hostUser = "$USER"
            
            echo "Connecting to ${host.name} (${host.ip})"
            
            def sshOptions = "-o StrictHostKeyChecking=no"
            def sshPass = "sshpass -p '$PASSWORD'"
            
            try {
              // Copy scripts to remote host
              ${params.scripts
                .map((script) => {
                  return `sh "$sshPass scp $sshOptions ${script.path} $hostUser@$hostIP:/tmp/"`;
                })
                .join('\n              ')}
              
              // Execute scripts on remote host
              ${params.scripts
                .map((script) => {
                  const scriptName = script.path.split('/').pop();
                  const params = script.parameters?.join(' ') || '';
                  const executor = script.type === 'python' ? 'python' : 'sh';

                  if (isWindows) {
                    return `sh "$sshPass ssh $sshOptions $hostUser@$hostIP powershell -Command \\"${
                      executor === 'python' ? 'python' : '.'
                    } /tmp/${scriptName}${params ? ' ' + params : ''}\\""`;
                  } else {
                    return `sh "$sshPass ssh $sshOptions $hostUser@$hostIP '${
                      executor === 'python' ? 'python' : 'bash'
                    } /tmp/${scriptName}${params ? ' ' + params : ''}'"`;
                  }
                })
                .join('\n              ')}
            } finally {
              // Cleanup temporary files
              ${params.scripts
                .map((script) => {
                  const scriptName = script.path.split('/').pop();
                  return `sh "$sshPass ssh $sshOptions $hostUser@$hostIP 'rm -f /tmp/${scriptName}'"`;
                })
                .join('\n              ')}
            }
          }`;
    })
    .join('\n\n');
}
