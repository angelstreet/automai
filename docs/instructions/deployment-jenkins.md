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

Implementation Status

✅ UI Components
- Updated DeploymentWizardStep5 to support switching between script view and Jenkins view
- Enhanced JenkinsConfig component with provider and job selection
- Added job parameter handling based on selected job
- Implemented loading states for asynchronous data fetching

✅ React Hooks
- Implemented useCICDProviders hook to fetch available CI/CD providers
- Implemented useCICDJobs hook to fetch jobs for a selected provider
- Implemented useCICDJobDetails hook to fetch job parameters
- Implemented useDeploymentStatus hook to monitor deployment and CI/CD status
- Added client-side caching with proper invalidation

✅ Server Actions
- Enhanced createDeployment action to support CI/CD integration
- Added actions to fetch CI/CD providers, jobs, and job details
- Added error handling and tenant isolation

Next Steps
1. Test the full flow by creating a deployment with Jenkins integration
2. Verify that CI/CD status is properly reflected in the deployment list
3. Implement a dedicated page for configuring CI/CD providers
4. Add more detailed logging and error handling

General Notes

1. Always use proper error handling at all layers
2. Ensure tenant isolation in all database operations
3. Follow the established three-layer architecture
4. Use TypeScript interfaces for all data structures
5. Test each layer independently before integration