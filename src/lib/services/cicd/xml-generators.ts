/**
 * Jenkins XML Pipeline Generator
 * Generates XML for creating Jenkins pipeline jobs
 */

/**
 * Generate Jenkins pipeline XML for deployment
 */
export function generateJenkinsPipelineXml(
  deploymentName: string,
  repositoryId: string, 
  scriptPaths: string[],
  scriptParameters: string[],
  hostIds: string[]
): string {
  // Format script commands with parameters
  const scriptCommands = scriptPaths.map((path, index) => {
    const param = scriptParameters[index] || '';
    return `                sh "python ${path} ${param}"`;
  }).join('\n');
  
  // Create pipeline XML with repository checkout and script execution
  return `<?xml version='1.0' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@2.40">
  <description>${deploymentName} - Automated deployment</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty />
    <hudson.model.ParametersDefinitionProperty>
      <parameterDefinitions>
        <hudson.model.StringParameterDefinition>
          <name>REPOSITORY_ID</name>
          <description>Repository ID to deploy from</description>
          <defaultValue>${repositoryId}</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.TextParameterDefinition>
          <name>HOST_IDS</name>
          <description>Host IDs to deploy to</description>
          <defaultValue>${hostIds.join('\n')}</defaultValue>
        </hudson.model.TextParameterDefinition>
      </parameterDefinitions>
    </hudson.model.ParametersDefinitionProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@2.87">
    <script>
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Deploy Scripts') {
            steps {
                script {
                    // Deploy scripts to selected hosts
${scriptCommands}
                }
            }
        }
    }
}
    </script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
</flow-definition>`;
} 