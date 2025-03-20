#!/usr/bin/env node

/**
 * Test script for Jenkins API
 * 
 * This script tests direct communication with a Jenkins server
 * without going through the application layers.
 */

const JENKINS_URL = 'http://jenkins-url'; // Replace with actual Jenkins URL
const USERNAME = 'admin'; // Replace with actual username
const TOKEN = 'your-token'; // Replace with actual token

// Function to encode credentials for Basic Auth
function encodeCredentials(username, token) {
  return Buffer.from(`${username}:${token}`).toString('base64');
}

// Test connection to Jenkins
async function testConnection() {
  try {
    console.log('Testing connection to Jenkins server...');
    const response = await fetch(`${JENKINS_URL}/api/json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodeCredentials(USERNAME, TOKEN)}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Connection failed: ${response.status} ${response.statusText}`);
      console.error(`Error: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log('Connection successful!');
    console.log('Jenkins info:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Connection error:', error.message);
    return false;
  }
}

// Get CSRF crumb for protected operations
async function getCrumb() {
  try {
    console.log('Getting CSRF crumb...');
    const response = await fetch(`${JENKINS_URL}/crumbIssuer/api/json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodeCredentials(USERNAME, TOKEN)}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to get crumb: ${response.status} ${response.statusText}`);
      console.error(`Error: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log('Crumb obtained:', data);
    return data;
  } catch (error) {
    console.error('Error getting crumb:', error.message);
    return null;
  }
}

// Create a Jenkins job
async function createJob(jobName, jobXml, crumb) {
  try {
    console.log(`Creating job: ${jobName}...`);
    
    const headers = {
      'Authorization': `Basic ${encodeCredentials(USERNAME, TOKEN)}`,
      'Content-Type': 'application/xml'
    };
    
    // Add crumb header if available
    if (crumb) {
      headers[crumb.crumbRequestField] = crumb.crumb;
    }
    
    const response = await fetch(`${JENKINS_URL}/createItem?name=${encodeURIComponent(jobName)}`, {
      method: 'POST',
      headers,
      body: jobXml
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to create job: ${response.status} ${response.statusText}`);
      console.error(`Error: ${errorText}`);
      return false;
    }

    console.log('Job created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating job:', error.message);
    return false;
  }
}

// Main function
async function main() {
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('Connection test failed, stopping.');
    return;
  }
  
  // Get CSRF crumb
  const crumb = await getCrumb();
  
  // Simple pipeline job XML
  const jobXml = `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@1316.ve8815bfba_de2">
  <description>Test job created via API</description>
  <keepDependencies>false</keepDependencies>
  <properties/>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@3812.vc3031a_f178a_e9">
    <script>
pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                echo 'Hello World!'
            }
        }
    }
}
    </script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>`;

  // Create a test job
  const jobName = `test-job-${Date.now()}`;
  await createJob(jobName, jobXml, crumb);
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 