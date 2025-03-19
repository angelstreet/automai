Jenkins Integration Implementation Guide
Overview
This guide provides implementation steps for integrating Jenkins with the deployment workflow. When a user creates a deployment through the wizard, we'll store it in our database and optionally trigger a Jenkins job.
Database Schema
The system uses the following tables:

deployments - Stores deployment information
cicd_providers - Stores connections to CI/CD systems (Jenkins)
cicd_jobs - Stores available jobs from CI/CD providers
deployment_cicd_mappings - Links deployments to CI/CD jobs

Implementation Steps
1. DB Layer Implementation
Create or update these files:
src/lib/supabase/db-deployment/index.ts      # Export all deployment DB functions
src/lib/supabase/db-deployment/deployment.ts  # Basic deployment CRUD
src/lib/supabase/db-deployment/cicd.ts        # CI/CD related DB functions

Implement these database functions:

createDeployment
updateDeployment
getDeployment
getCICDProvider
getCICDJobs
createDeploymentCICDMapping
updateDeploymentCICDMapping

2. CI/CD Service Layer
Create adapter pattern for CI/CD providers:
src/lib/services/cicd/index.ts       # Main export
src/lib/services/cicd/interfaces.ts  # Common interface
src/lib/services/cicd/jenkins.ts     # Jenkins-specific implementation
src/lib/services/cicd/factory.ts     # Provider factory

Key functions to implement:

getAvailableJobs - Fetches jobs from Jenkins
triggerJob - Starts a Jenkins build
getBuildStatus - Checks build status
getBuildLogs - Retrieves build logs

3. Server Actions
Update deployment actions:
src/app/[locale]/[tenant]/deployment/actions.ts

Implement these server actions:

createDeployment - Creates deployment and triggers CI/CD job
getAvailableCICDJobs - Gets jobs for selection in UI
getDeploymentStatus - Gets deployment status (including CI/CD)

4. UI Components
Update the deployment wizard review step:
src/app/[locale]/[tenant]/deployment/_components/DeploymentWizardStep5.tsx

Add form fields for:

Selecting a Jenkins server
Selecting a Jenkins job
Configuring job parameters

5. Hook Updates
Update deployment hooks:
src/app/[locale]/[tenant]/deployment/hooks.ts

Implement these hooks:

useCICDProviders - Get available CI/CD providers
useCICDJobs - Get available jobs for a provider
useCreateDeployment - Create deployment with CI/CD integration

Implementation Sequence

Start with DB layer functions for deployments and CI/CD
Implement CI/CD service for Jenkins integration
Create server actions to bridge DB and services
Update UI components to use the new actions
Add hooks for simplified React integration
Test the full flow from UI to Jenkins

Notes

Use proper error handling at all layers
Implement tenant isolation
Follow the established three-layer architecture
Use TypeScript interfaces for all data structures
Test each layer independently